'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useUser } from '@/hooks/use-user';
import apiClient from '@/lib/api-client';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { ChatTeardropText as ChatIcon } from '@phosphor-icons/react/dist/ssr/ChatTeardropText';
import { PaperPlaneRight as SendIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneRight';
import { X as CloseIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Minus as MinimizeIcon } from '@phosphor-icons/react/dist/ssr/Minus';
import { MagnifyingGlass as SearchIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Gear as SettingsIcon } from '@phosphor-icons/react/dist/ssr/Gear';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import dayjs from 'dayjs';

interface ChatUser {
    id: number;
    fullName: string;
    email: string;
    role: string;
    avatarUrl?: string;
    unreadCount: number;
}

interface ChatGroup {
    id: number;
    name: string;
    userIds: number[];
}

type ThreadType = 'direct' | 'group';

interface ChatThread {
    id: number;
    name: string;
    type: ThreadType;
    avatarUrl?: string;
    unreadCount: number;
    subtitle: string;
    userIds?: number[];
}

interface Message {
    id: number;
    senderId: number;
    senderName?: string;
    receiverId?: number | null;
    staffGroupId?: number | null;
    messageText: string;
    timestamp: string;
    isRead: boolean;
    receivedAt?: number;
}

interface NotificationItem {
    id: number;
    senderId: number;
    senderName: string;
    text: string;
    threadType: ThreadType;
    threadId: number;
}

function getInitials(name?: string) {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function stringToColor(string: string) {
    let hash = 0;
    for (let i = 0; i < string.length; i += 1) {
        hash = (string.codePointAt(i) ?? 0) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 60%, 45%)`;
}

interface ChatWindowProps {
    thread: ChatThread;
    currentUser: { id: number; fullName: string; email: string };
    lastMessage: Message | null;
    onClose: () => void;
    onMessageRead: (threadId: number, threadType: ThreadType) => void;
    onGroupUpdated: () => void;
    allUsers: ChatUser[];
}

function ChatWindow({ thread, currentUser, lastMessage, onClose, onMessageRead, onGroupUpdated, allUsers }: ChatWindowProps): React.JSX.Element {
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [inputText, setInputText] = React.useState('');
    const [loadingMessages, setLoadingMessages] = React.useState(false);
    const [isMinimized, setIsMinimized] = React.useState(false);
    
    // Collapsed unseen messages state
    const [unseenCount, setUnseenCount] = React.useState(0);
    
    // Sound control state (persisted per thread in localStorage)
    const [isSoundEnabled, setIsSoundEnabled] = React.useState(() => {
        try {
            const saved = localStorage.getItem(`chat-sound-${thread.type}-${thread.id}`);
            return saved !== null ? saved === 'true' : true;
        } catch {
            return true;
        }
    });

    // Group settings menu state
    const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(null);
    const isMenuOpen = Boolean(menuAnchorEl);

    // Edit Group dialog state
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [editGroupName, setEditGroupName] = React.useState(thread.name);
    const [editSelectedUserIds, setEditSelectedUserIds] = React.useState<number[]>(thread.userIds || []);
    const [editSearchQuery, setEditSearchQuery] = React.useState('');
    const [isSavingEdit, setIsSavingEdit] = React.useState(false);

    // Delete confirmation state
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
    const [isDeletingGroup, setIsDeletingGroup] = React.useState(false);
    
    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const mountTimeRef = React.useRef<number>(Date.now());
    const prevMessagesLengthRef = React.useRef<number>(0);

    // Keep edit state in sync with thread
    React.useEffect(() => {
        setEditGroupName(thread.name);
        setEditSelectedUserIds(thread.userIds || []);
    }, [thread]);

    // Reset unseen messages when chat window is expanded
    React.useEffect(() => {
        if (!isMinimized) {
            setUnseenCount(0);
            if (thread.type === 'direct') {
                apiClient.post(`/Chat/messages/read?senderId=${thread.id}`)
                    .then(() => onMessageRead(thread.id, 'direct'))
                    .catch(err => console.error('Error marking message read:', err));
            } else if (thread.type === 'group') {
                onMessageRead(thread.id, 'group');
            }
        }
    }, [isMinimized, thread.id, thread.type, onMessageRead]);

    // Sound play helper
    const playNotificationSound = React.useCallback(() => {
        if (isSoundEnabled) {
            const audio = new Audio('/sounds/Notification.wav');
            audio.play().catch(err => {
                console.log('Audio playback blocked or failed:', err);
            });
        }
    }, [isSoundEnabled]);

    const toggleMinimize = (event?: React.MouseEvent) => {
        if (event) event.stopPropagation();
        setIsMinimized(prev => !prev);
    };

    // Fetch messages for this thread
    const fetchMessages = React.useCallback(async () => {
        setLoadingMessages(true);
        try {
            const queryParam = thread.type === 'group' ? `staffGroupId=${thread.id}` : `otherUserId=${thread.id}`;
            const res = await apiClient.get(`/Chat/messages?${queryParam}`);
            setMessages(res.data);
            
            if (thread.type === 'direct') {
                await apiClient.post(`/Chat/messages/read?senderId=${thread.id}`);
                onMessageRead(thread.id, 'direct');
            } else if (thread.type === 'group') {
                onMessageRead(thread.id, 'group');
            }
        } catch (err) {
            console.error('Failed to load messages for thread:', thread.id, err);
        } finally {
            setLoadingMessages(false);
        }
    }, [thread.id, thread.type, onMessageRead]);

    React.useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    // Scroll to bottom when messages change
    React.useEffect(() => {
        if (!isMinimized && messages.length > 0) {
            const isNewMessage = messages.length > prevMessagesLengthRef.current && prevMessagesLengthRef.current > 0;
            prevMessagesLengthRef.current = messages.length;

            const delay = 250; // Delay to allow CSS height transition to complete
            const timer = setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ 
                    behavior: isNewMessage ? 'smooth' : 'auto' 
                });
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [messages, isMinimized]);

    // Listen to new real-time messages from parent
    React.useEffect(() => {
        if (!lastMessage) return;

        // Ignore messages received before this window was opened
        if (lastMessage.receivedAt && lastMessage.receivedAt < mountTimeRef.current) {
            return;
        }

        const isGroup = lastMessage.staffGroupId !== null && lastMessage.staffGroupId !== undefined;
        const matchesGroup = isGroup && thread.type === 'group' && lastMessage.staffGroupId === thread.id;
        const matchesDirect = !isGroup && thread.type === 'direct' && 
            (lastMessage.senderId === thread.id || lastMessage.receiverId === thread.id);

        if (matchesGroup || matchesDirect) {
            const isMe = lastMessage.senderId === currentUser.id;

            setMessages(prev => {
                if (prev.some(m => m.id === lastMessage.id)) return prev;
                return [...prev, lastMessage];
            });

            if (!isMe) {
                playNotificationSound();
                if (isMinimized) {
                    setUnseenCount(prev => prev + 1);
                }
            }

            // Mark direct/group messages as read if we are focused and not minimized
            if (!isMinimized) {
                if (!isGroup && lastMessage.senderId === thread.id) {
                    apiClient.post(`/Chat/messages/read?senderId=${thread.id}`)
                        .then(() => onMessageRead(thread.id, 'direct'))
                        .catch(err => console.error('Error marking message read:', err));
                } else if (isGroup && lastMessage.staffGroupId === thread.id) {
                    onMessageRead(thread.id, 'group');
                }
            }
        }
    }, [lastMessage, thread.id, thread.type, isMinimized, onMessageRead, playNotificationSound, currentUser.id]);

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;
        const text = inputText.trim();
        setInputText('');

        try {
            const body: any = { messageText: text };
            if (thread.type === 'group') {
                body.staffGroupId = thread.id;
            } else {
                body.receiverId = thread.id;
            }
            await apiClient.post('/Chat/messages', body);
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        setMenuAnchorEl(event.currentTarget);
    };

    const handleMenuClose = (event?: any) => {
        if (event && event.stopPropagation) event.stopPropagation();
        setMenuAnchorEl(null);
    };

    const handleOpenEditDialog = (event: React.MouseEvent) => {
        event.stopPropagation();
        handleMenuClose();
        setIsEditDialogOpen(true);
    };

    const handleOpenDeleteDialog = (event: React.MouseEvent) => {
        event.stopPropagation();
        handleMenuClose();
        setIsDeleteDialogOpen(true);
    };

    const handleToggleSound = (event: React.MouseEvent) => {
        event.stopPropagation();
        setIsSoundEnabled(prev => {
            const next = !prev;
            try {
                localStorage.setItem(`chat-sound-${thread.type}-${thread.id}`, String(next));
            } catch {}
            return next;
        });
    };

    const handleSaveEdit = async () => {
        if (!editGroupName.trim() || editSelectedUserIds.length === 0) return;
        setIsSavingEdit(true);
        try {
            const userIds = Array.from(new Set([currentUser.id, ...editSelectedUserIds]));
            await apiClient.put(`/StaffGroups/${thread.id}`, {
                name: editGroupName.trim(),
                userIds
            });
            setIsEditDialogOpen(false);
            onGroupUpdated();
        } catch (err) {
            console.error('Failed to update group:', err);
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleDeleteGroup = async () => {
        setIsDeletingGroup(true);
        try {
            await apiClient.delete(`/StaffGroups/${thread.id}`);
            setIsDeleteDialogOpen(false);
            onClose();
            onGroupUpdated();
        } catch (err) {
            console.error('Failed to delete group:', err);
        } finally {
            setIsDeletingGroup(false);
        }
    };

    return (
        <>
            <Paper 
                elevation={4} 
                sx={{ 
                    width: { xs: '100%', sm: 320 }, 
                    height: { xs: isMinimized ? 44 : '60vh', sm: isMinimized ? 44 : 400 }, 
                    maxHeight: '80vh',
                    display: 'flex', 
                    flexDirection: 'column', 
                    borderRadius: '12px 12px 0 0', 
                    overflow: 'hidden', 
                    pointerEvents: 'auto',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.2s ease-in-out'
                }}
            >
                {/* Chat Header */}
                <Stack 
                    direction="row" 
                    alignItems="center" 
                    justifyContent="space-between" 
                    sx={{ 
                        px: 1.5, 
                        py: 1, 
                        bgcolor: 'primary.main', 
                        color: 'primary.contrastText',
                        cursor: 'pointer'
                    }}
                    onClick={toggleMinimize}
                >
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Badge badgeContent={isMinimized ? unseenCount : 0} color="error">
                            <Avatar 
                                src={thread.avatarUrl} 
                                sx={{ 
                                    width: 28, 
                                    height: 28, 
                                    bgcolor: stringToColor(thread.name),
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                {getInitials(thread.name)}
                            </Avatar>
                        </Badge>
                        <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.2 }}>
                                {thread.name}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.65rem' }}>
                                {thread.subtitle}
                            </Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={0.5} onClick={e => e.stopPropagation()}>
                        <IconButton size="small" sx={{ color: 'inherit' }} onClick={handleMenuOpen}>
                            <SettingsIcon size={16} />
                        </IconButton>
                        <Menu
                            anchorEl={menuAnchorEl}
                            open={isMenuOpen}
                            onClose={handleMenuClose}
                            onClick={e => e.stopPropagation()}
                        >
                            {thread.type === 'group' && (
                                <MenuItem onClick={handleOpenEditDialog} sx={{ fontSize: '0.8rem' }}>
                                    Group Settings
                                </MenuItem>
                            )}
                            {thread.type === 'group' && (
                                <MenuItem onClick={handleOpenDeleteDialog} sx={{ fontSize: '0.8rem', color: 'error.main' }}>
                                    Delete Group
                                </MenuItem>
                            )}
                            {thread.type === 'group' && <Divider />}
                            <MenuItem 
                                onClick={(e) => {
                                    handleToggleSound(e);
                                    handleMenuClose();
                                }} 
                                sx={{ fontSize: '0.8rem' }}
                            >
                                <Checkbox size="small" checked={isSoundEnabled} sx={{ p: 0.5, mr: 0.5 }} readOnly />
                                Play Notification Sound
                            </MenuItem>
                        </Menu>

                        <IconButton size="small" sx={{ color: 'inherit' }} onClick={toggleMinimize}>
                            <MinimizeIcon size={16} />
                        </IconButton>
                        <IconButton size="small" sx={{ color: 'inherit' }} onClick={onClose}>
                            <CloseIcon size={16} />
                        </IconButton>
                    </Stack>
                </Stack>

                {/* Chat Messages History */}
                {!isMinimized && (
                    <>
                        <Box sx={{ flexGrow: 1, p: 1.5, overflowY: 'auto', bgcolor: '#f8f9fa', display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {loadingMessages ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }} />
                            ) : messages.length === 0 ? (
                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', mt: 4 }}>
                                    No messages yet. Say hello! 👋
                                </Typography>
                            ) : (
                                messages.map((m) => {
                                    const isMe = m.senderId === currentUser.id;
                                    const isGroup = thread.type === 'group';
                                    return (
                                        <Box 
                                            key={m.id} 
                                            sx={{ 
                                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                                maxWidth: '80%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: isMe ? 'flex-end' : 'flex-start'
                                            }}
                                        >
                                            {!isMe && isGroup && (
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 600, mb: 0.25, ml: 0.5 }}>
                                                    {m.senderName || 'Colleague'}
                                                </Typography>
                                            )}
                                            <Tooltip title={dayjs(m.timestamp).format('h:mm A')} placement={isMe ? 'left' : 'right'}>
                                                <Box 
                                                    sx={{ 
                                                        bgcolor: isMe ? 'primary.main' : 'grey.200', 
                                                        color: isMe ? 'primary.contrastText' : 'text.primary', 
                                                        p: 1, 
                                                        px: 1.5, 
                                                        borderRadius: '16px',
                                                        borderTopRightRadius: isMe ? '2px' : '16px',
                                                        borderTopLeftRadius: isMe ? '16px' : '2px',
                                                        fontSize: '0.8rem',
                                                        lineHeight: 1.3,
                                                        wordBreak: 'break-word'
                                                    }}
                                                >
                                                    {m.messageText}
                                                </Box>
                                            </Tooltip>
                                        </Box>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </Box>
                        <Divider />
                        {/* Input Form */}
                        <Box sx={{ p: 1, bgcolor: 'background.paper' }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <TextField
                                    size="small"
                                    fullWidth
                                    placeholder="Type a message..."
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '20px', fontSize: '0.8rem' } }}
                                />
                                <IconButton 
                                    color="primary" 
                                    disabled={!inputText.trim()}
                                    onClick={handleSendMessage}
                                >
                                    <SendIcon size={18} weight="fill" />
                                </IconButton>
                            </Stack>
                        </Box>
                    </>
                )}
            </Paper>

            {/* Edit Group Dialog */}
            <Dialog open={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} maxWidth="xs" fullWidth sx={{ pointerEvents: 'auto' }}>
                <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>Group Settings</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Group Name"
                            size="small"
                            fullWidth
                            value={editGroupName}
                            onChange={e => setEditGroupName(e.target.value)}
                        />
                        <TextField
                            placeholder="Search colleagues..."
                            size="small"
                            fullWidth
                            value={editSearchQuery}
                            onChange={e => setEditSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon size={16} />
                                    </InputAdornment>
                                )
                            }}
                        />
                        <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5 }}>
                            {allUsers
                                .filter(u => u.fullName.toLowerCase().includes(editSearchQuery.toLowerCase()))
                                .map(u => {
                                    const isSelected = editSelectedUserIds.includes(u.id);
                                    return (
                                        <Stack
                                            key={u.id}
                                            direction="row"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            onClick={() => {
                                                setEditSelectedUserIds(prev =>
                                                    prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                                                );
                                            }}
                                            sx={{
                                                p: 0.75,
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                '&:hover': { bgcolor: 'action.hover' }
                                            }}
                                        >
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Avatar src={u.avatarUrl} sx={{ width: 28, height: 28, bgcolor: stringToColor(u.fullName), fontSize: '0.75rem' }}>
                                                    {getInitials(u.fullName)}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                                                        {u.fullName}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                                        {u.role}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            <Checkbox size="small" checked={isSelected} readOnly sx={{ p: 0.5 }} />
                                        </Stack>
                                    );
                                })}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsEditDialogOpen(false)} size="small">Cancel</Button>
                    <Button
                        onClick={handleSaveEdit}
                        variant="contained"
                        size="small"
                        disabled={!editGroupName.trim() || editSelectedUserIds.length === 0 || isSavingEdit}
                    >
                        {isSavingEdit ? 'Saving...' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Group Dialog */}
            <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} maxWidth="xs" sx={{ pointerEvents: 'auto' }}>
                <DialogTitle sx={{ fontWeight: 700 }}>Delete Group Chat</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        Are you sure you want to delete the group chat "{thread.name}"? This action cannot be undone and all message history will be lost.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsDeleteDialogOpen(false)} size="small">Cancel</Button>
                    <Button
                        onClick={handleDeleteGroup}
                        variant="contained"
                        color="error"
                        size="small"
                        disabled={isDeletingGroup}
                    >
                        {isDeletingGroup ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export function ChatWidget(): React.JSX.Element | null {
    const { user } = useUser();
    
    // UI Layout States
    const [isMenuExpanded, setIsMenuExpanded] = React.useState(false);
    const [openThreads, setOpenThreads] = React.useState<ChatThread[]>([]);
    
    // Group Creation States
    const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
    const [newGroupName, setNewGroupName] = React.useState('');
    const [selectedUserIds, setSelectedUserIds] = React.useState<number[]>([]);
    const [dialogSearchQuery, setDialogSearchQuery] = React.useState('');
    const [isCreatingGroup, setIsCreatingGroup] = React.useState(false);

    // Data States
    const [users, setUsers] = React.useState<ChatUser[]>([]);
    const [myGroups, setMyGroups] = React.useState<ChatGroup[]>([]);
    const [threads, setThreads] = React.useState<ChatThread[]>([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
    const [lastMessage, setLastMessage] = React.useState<Message | null>(null);
    
    const connectionRef = React.useRef<any>(null);
    const myGroupsRef = React.useRef<ChatGroup[]>([]);
    const openThreadsRef = React.useRef<ChatThread[]>([]);

    // Keep open threads ref fresh for SignalR listener
    React.useEffect(() => {
        openThreadsRef.current = openThreads;
    }, [openThreads]);

    // Fetch users and groups, construct threads list
    const fetchData = React.useCallback(async () => {
        if (!user) return;
        try {
            // Load all active users
            const usersRes = await apiClient.get('/Chat/users');
            const fetchedUsers: ChatUser[] = usersRes.data;
            setUsers(fetchedUsers);

            // Load all staff groups
            const groupsRes = await apiClient.get('/StaffGroups');
            const fetchedGroups: ChatGroup[] = groupsRes.data;

            // Filter groups containing the current user
            const userGroups = fetchedGroups.filter(g => g.userIds.includes(user.id));
            setMyGroups(userGroups);
            myGroupsRef.current = userGroups;

            // Construct Thread items
            const directThreads: ChatThread[] = fetchedUsers.map(u => ({
                id: u.id,
                name: u.fullName,
                type: 'direct',
                avatarUrl: u.avatarUrl,
                unreadCount: u.unreadCount,
                subtitle: u.role
            }));

            const groupThreads: ChatThread[] = userGroups.map(g => ({
                id: g.id,
                name: g.name,
                type: 'group',
                unreadCount: 0,
                subtitle: `${g.userIds.length} members`,
                userIds: g.userIds
            }));

            const freshThreads = [...groupThreads, ...directThreads];
            setThreads(freshThreads);
            setOpenThreads(prev => prev.map(openT => {
                const freshT = freshThreads.find(t => t.id === openT.id && t.type === openT.type);
                return freshT ? freshT : openT;
            }));
        } catch (err) {
            console.error('Failed to load chat data:', err);
        }
    }, [user]);

    // Initialize SignalR and load initial data
    React.useEffect(() => {
        if (!user) {
            // Close connection on logout
            if (connectionRef.current) {
                connectionRef.current.stop();
                connectionRef.current = null;
            }
            return;
        }

        fetchData();

        // Establish SignalR Hub connection using the existing hub endpoint
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082/api';
        const baseUrl = apiBase.replace(/\/api\/?$/, '');
        
        const connection = new HubConnectionBuilder()
            .withUrl(`${baseUrl}/hubs/appointments`, {
                accessTokenFactory: () => {
                    try {
                        return localStorage.getItem('custom-auth-token') || '';
                    } catch {
                        return '';
                    }
                }
            })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.None)
            .build();

        connectionRef.current = connection;

        connection.on('ReceiveChatMessage', (msg: Message) => {
            const currentUserId = user.id;

            // Determine if message is group chat or direct message
            const isGroup = msg.staffGroupId !== null && msg.staffGroupId !== undefined;
            
            // Check relevance: direct message for us, or group message for a group we are in
            let isRelevant = false;
            if (isGroup) {
                isRelevant = myGroupsRef.current.some(g => g.id === msg.staffGroupId);
            } else {
                isRelevant = msg.senderId === currentUserId || msg.receiverId === currentUserId;
            }

            if (!isRelevant) return;

            // Forward to active chat windows with local arrival timestamp
            setLastMessage({ ...msg, receivedAt: Date.now() });

            const isThreadOpen = openThreadsRef.current.some(t => 
                isGroup 
                    ? (t.type === 'group' && t.id === msg.staffGroupId)
                    : (t.type === 'direct' && t.id === msg.senderId)
            );

            if (msg.senderId !== currentUserId) {
                // Increment unread count for the matching thread
                setThreads(prev => prev.map(t => {
                    const matchesGroup = isGroup && t.type === 'group' && t.id === msg.staffGroupId;
                    const matchesDirect = !isGroup && t.type === 'direct' && t.id === msg.senderId;
                    if (matchesGroup || matchesDirect) {
                        return { ...t, unreadCount: t.unreadCount + 1 };
                    }
                    return t;
                }));

                // Add a notification toast item if the thread is not open
                if (!isThreadOpen) {
                    const threadId = isGroup ? msg.staffGroupId! : msg.senderId;
                    const threadType = isGroup ? 'group' : 'direct';
                    let isSoundEnabled = true;
                    try {
                        const saved = localStorage.getItem(`chat-sound-${threadType}-${threadId}`);
                        isSoundEnabled = saved !== 'false';
                    } catch {
                        isSoundEnabled = true;
                    }

                    if (isSoundEnabled) {
                        const audio = new Audio('/sounds/Notification.wav');
                        audio.play().catch(err => {
                            console.log('Audio playback blocked or failed in parent:', err);
                        });
                    }

                    const senderDisplayName = isGroup 
                        ? `[Group] ${msg.senderName || 'Colleague'}` 
                        : (msg.senderName || 'Colleague');

                    setNotifications(prev => [
                        ...prev.filter(n => !(n.threadType === (isGroup ? 'group' : 'direct') && n.threadId === (isGroup ? msg.staffGroupId : msg.senderId))), // prevent duplicate notifications per thread
                        {
                            id: msg.id,
                            senderId: msg.senderId,
                            senderName: senderDisplayName,
                            text: msg.messageText,
                            threadType: isGroup ? 'group' : 'direct',
                            threadId: isGroup ? msg.staffGroupId! : msg.senderId
                        }
                    ]);
                }
            }
        });

        connection.start().catch(err => {
            if (!err?.message?.includes('stopped during negotiation')) {
                console.error('Chat SignalR connection error:', err);
            }
        });

        return () => {
            connection.stop().catch(() => {});
            connectionRef.current = null;
        };
    }, [user, fetchData]);

    const handleMessageRead = React.useCallback((threadId: number, threadType: ThreadType) => {
        setThreads(prev => prev.map(t => t.id === threadId && t.type === threadType ? { ...t, unreadCount: 0 } : t));
    }, []);

    if (!user) return null;

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || selectedUserIds.length === 0) return;
        setIsCreatingGroup(true);
        try {
            // Include current user in group
            const userIds = Array.from(new Set([user.id, ...selectedUserIds]));
            await apiClient.post('/StaffGroups', {
                name: newGroupName.trim(),
                userIds
            });
            setIsCreateDialogOpen(false);
            setNewGroupName('');
            setSelectedUserIds([]);
            setDialogSearchQuery('');
            await fetchData(); // Refresh list to show new group
        } catch (err) {
            console.error('Failed to create group:', err);
        } finally {
            setIsCreatingGroup(false);
        }
    };

    const handleThreadClick = (thread: ChatThread) => {
        setOpenThreads(prev => {
            if (prev.some(t => t.id === thread.id && t.type === thread.type)) {
                return prev;
            }
            // Limit to max 3 simultaneous open chats to avoid screen overflow
            const next = [...prev, thread];
            if (next.length > 3) {
                return next.slice(next.length - 3);
            }
            return next;
        });
        setNotifications(prev => prev.filter(n => !(n.threadType === thread.type && n.threadId === thread.id)));
    };

    const handleCloseThread = (threadId: number, threadType: ThreadType) => {
        setOpenThreads(prev => prev.filter(t => !(t.id === threadId && t.type === threadType)));
    };

    const handleNotificationClick = (item: NotificationItem) => {
        const targetThread = threads.find(t => t.id === item.threadId && t.type === item.threadType);
        if (targetThread) {
            handleThreadClick(targetThread);
        }
        setNotifications(prev => prev.filter(n => n.id !== item.id));
    };

    const filteredThreads = threads.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

    return (
        <Box
            sx={{
                position: 'fixed',
                bottom: 0,
                right: { xs: 8, sm: 24 },
                left: { xs: 8, sm: 'auto' },
                zIndex: 1200,
                display: 'flex',
                flexDirection: { xs: 'column-reverse', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'flex-end' },
                gap: { xs: 1, sm: 2 },
                pointerEvents: 'none'
            }}
        >
            
            {/* Real-time Toast Notifications Box */}
            <Stack spacing={1} sx={{ mb: 2, pointerEvents: 'auto', maxWidth: { xs: '100%', sm: 280 }, alignItems: { xs: 'stretch', sm: 'flex-end' } }}>
                {notifications.map(n => (
                    <Card 
                        key={n.id} 
                        onClick={() => handleNotificationClick(n)}
                        sx={{ 
                            p: 1.5, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 0.5, 
                            cursor: 'pointer',
                            bgcolor: 'primary.main', 
                            color: 'primary.contrastText',
                            borderRadius: 2,
                            boxShadow: 3,
                            transition: 'transform 0.2s',
                            '&:hover': { transform: 'scale(1.02)' }
                        }}
                    >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                💬 {n.senderName}
                            </Typography>
                            <IconButton 
                                size="small" 
                                sx={{ color: 'inherit', p: 0.25 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setNotifications(prev => prev.filter(item => item.id !== n.id));
                                }}
                            >
                                <CloseIcon size={14} />
                            </IconButton>
                        </Stack>
                        <Typography variant="body2" noWrap sx={{ fontSize: '0.8rem', maxWidth: 240 }}>
                            {n.text}
                        </Typography>
                    </Card>
                ))}
            </Stack>

            {/* Active Floating Chat Windows */}
            {openThreads.map(thread => (
                <ChatWindow
                    key={`${thread.type}-${thread.id}`}
                    thread={thread}
                    currentUser={user}
                    lastMessage={lastMessage}
                    onClose={() => handleCloseThread(thread.id, thread.type)}
                    onMessageRead={handleMessageRead}
                    onGroupUpdated={fetchData}
                    allUsers={users}
                />
            ))}

            {/* Expandable Menu Thread List */}
            <Paper 
                elevation={4} 
                sx={{ 
                    width: { xs: '100%', sm: 280 }, 
                    height: { xs: isMenuExpanded ? '55vh' : 44, sm: isMenuExpanded ? 400 : 44 }, 
                    maxHeight: '75vh',
                    display: 'flex', 
                    flexDirection: 'column', 
                    borderRadius: '12px 12px 0 0', 
                    overflow: 'hidden', 
                    pointerEvents: 'auto',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.2s ease-in-out'
                }}
            >
                {/* Collapsed/Expanded Header Toggle */}
                <Stack 
                    direction="row" 
                    alignItems="center" 
                    justifyContent="space-between" 
                    sx={{ 
                        px: 1.5, 
                        py: 1.2, 
                        bgcolor: 'background.paper', 
                        borderBottom: isMenuExpanded ? '1px solid' : 'none',
                        borderColor: 'divider',
                        cursor: 'pointer'
                    }}
                    onClick={() => setIsMenuExpanded(prev => !prev)}
                >
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Badge badgeContent={totalUnread} color="error">
                            <ChatIcon size={20} color="#1976d2" weight="fill" />
                        </Badge>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                            Staff Chat
                        </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {isMenuExpanded ? 'Hide' : 'Show'}
                    </Typography>
                </Stack>

                {/* List Body */}
                {isMenuExpanded && (
                    <>
                        {/* Search field */}
                        <Box sx={{ p: 1 }}>
                            <TextField
                                size="small"
                                fullWidth
                                placeholder="Search conversation..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon size={16} />
                                        </InputAdornment>
                                    ),
                                    style: { fontSize: '0.75rem', borderRadius: '8px' }
                                }}
                            />
                        </Box>
                        
                        <Divider />

                        {/* List */}
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 0.5 }}>
                            {filteredThreads.length === 0 ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 4, fontStyle: 'italic' }}>
                                    No conversations found.
                                </Typography>
                            ) : (
                                <>
                                    {/* Group Chats Section */}
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1, pt: 1, pb: 0.5 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            Group Chats
                                        </Typography>
                                        <Tooltip title="Create Group Chat">
                                            <IconButton size="small" onClick={() => setIsCreateDialogOpen(true)} sx={{ p: 0.25 }}>
                                                <PlusIcon size={14} weight="bold" />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>

                                    {filteredThreads.filter(t => t.type === 'group').map(t => (
                                        <Stack 
                                            key={`group-${t.id}`}
                                            direction="row"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            onClick={() => handleThreadClick(t)}
                                            sx={{ 
                                                p: 1, 
                                                borderRadius: '8px', 
                                                cursor: 'pointer',
                                                transition: 'background-color 0.15s',
                                                '&:hover': { bgcolor: 'action.hover' },
                                                bgcolor: openThreads.some(ot => ot.type === 'group' && ot.id === t.id) ? 'action.selected' : 'transparent'
                                            }}
                                        >
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Avatar 
                                                    sx={{ 
                                                        width: 32, 
                                                        height: 32, 
                                                        bgcolor: stringToColor(t.name),
                                                        fontSize: '0.8rem',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    {getInitials(t.name)}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.2 }}>
                                                        {t.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                                        {t.subtitle}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            {t.unreadCount > 0 && (
                                                <Badge badgeContent={t.unreadCount} color="error" sx={{ mr: 1 }} />
                                            )}
                                        </Stack>
                                    ))}

                                    <Divider sx={{ my: 1 }} />

                                    {/* Direct Messages Section */}
                                    <Typography variant="caption" sx={{ px: 1, pt: 0.5, pb: 0.5, display: 'block', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Colleagues
                                    </Typography>

                                    {filteredThreads.filter(t => t.type === 'direct').map(t => (
                                        <Stack 
                                            key={`direct-${t.id}`}
                                            direction="row"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            onClick={() => handleThreadClick(t)}
                                            sx={{ 
                                                p: 1, 
                                                borderRadius: '8px', 
                                                cursor: 'pointer',
                                                transition: 'background-color 0.15s',
                                                '&:hover': { bgcolor: 'action.hover' },
                                                bgcolor: openThreads.some(ot => ot.type === 'direct' && ot.id === t.id) ? 'action.selected' : 'transparent'
                                            }}
                                        >
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Avatar 
                                                    src={t.avatarUrl} 
                                                    sx={{ 
                                                        width: 32, 
                                                        height: 32, 
                                                        bgcolor: stringToColor(t.name),
                                                        fontSize: '0.8rem',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    {getInitials(t.name)}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.2 }}>
                                                        {t.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>
                                                        {t.subtitle}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            {t.unreadCount > 0 && (
                                                <Badge badgeContent={t.unreadCount} color="error" sx={{ mr: 1 }} />
                                            )}
                                        </Stack>
                                    ))}
                                </>
                            )}
                        </Box>
                    </>
                )}
            </Paper>

            {/* Create Group Chat Dialog */}
            <Dialog open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} maxWidth="xs" fullWidth sx={{ pointerEvents: 'auto' }}>
                <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>Create Group Chat</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            autoFocus
                            label="Group Name"
                            size="small"
                            fullWidth
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                        />
                        <TextField
                            placeholder="Search colleagues..."
                            size="small"
                            fullWidth
                            value={dialogSearchQuery}
                            onChange={e => setDialogSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon size={16} />
                                    </InputAdornment>
                                )
                            }}
                        />
                        <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5 }}>
                            {users
                                .filter(u => u.fullName.toLowerCase().includes(dialogSearchQuery.toLowerCase()))
                                .map(u => {
                                    const isSelected = selectedUserIds.includes(u.id);
                                    return (
                                        <Stack
                                            key={u.id}
                                            direction="row"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            onClick={() => {
                                                setSelectedUserIds(prev =>
                                                    prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                                                );
                                            }}
                                            sx={{
                                                p: 0.75,
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                '&:hover': { bgcolor: 'action.hover' }
                                            }}
                                        >
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Avatar src={u.avatarUrl} sx={{ width: 28, height: 28, bgcolor: stringToColor(u.fullName), fontSize: '0.75rem' }}>
                                                    {getInitials(u.fullName)}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                                                        {u.fullName}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                                        {u.role}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            <Checkbox size="small" checked={isSelected} readOnly sx={{ p: 0.5 }} />
                                        </Stack>
                                    );
                                })}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsCreateDialogOpen(false)} size="small">Cancel</Button>
                    <Button
                        onClick={handleCreateGroup}
                        variant="contained"
                        size="small"
                        disabled={!newGroupName.trim() || selectedUserIds.length === 0 || isCreatingGroup}
                    >
                        {isCreatingGroup ? 'Creating...' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

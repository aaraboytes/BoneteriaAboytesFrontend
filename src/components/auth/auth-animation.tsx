'use client';

import React from 'react';
import Lottie from 'lottie-react';
import animationData from '../../../public/assets/auth-animation.json';

export function AuthAnimation(): React.JSX.Element {
  return (
    <Lottie 
      animationData={animationData} 
      loop={true} 
      style={{ height: 'auto', width: '100%', maxWidth: '600px' }} 
    />
  );
}

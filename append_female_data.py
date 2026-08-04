import re

front_js_path = 'scratch/temp-body/node_modules/react-native-body-highlighter/dist/assets/bodyFemaleFront.js'
back_js_path = 'scratch/temp-body/node_modules/react-native-body-highlighter/dist/assets/bodyFemaleBack.js'
front_outline_path = 'scratch/temp-body/node_modules/react-native-body-highlighter/dist/components/SvgFemaleWrapper.js'

with open(front_js_path, 'r', encoding='utf-8') as f:
    front_js = f.read()

with open(back_js_path, 'r', encoding='utf-8') as f:
    back_js = f.read()

with open(front_outline_path, 'r', encoding='utf-8') as f:
    wrapper_js = f.read()

front_data = re.search(r'exports\.bodyFemaleFront = (\[.*?\]);', front_js, re.DOTALL).group(1)
back_data = re.search(r'exports\.bodyFemaleBack = (\[.*?\]);', back_js, re.DOTALL).group(1)

outline_front = re.search(r'accessibilityLabel="female-body-outline-front"\s*/>.*?d="([^"]+)"', wrapper_js, re.DOTALL)
if not outline_front:
    outline_front = re.search(r'd="([^"]+)"\s*accessible=\{true\}\s*accessibilityLabel="female-body-outline-front"', wrapper_js, re.DOTALL)

outline_back = re.search(r'accessibilityLabel="female-body-outline-back"\s*/>.*?d="([^"]+)"', wrapper_js, re.DOTALL)
if not outline_back:
    outline_back = re.search(r'd="([^"]+)"\s*accessible=\{true\}\s*accessibilityLabel="female-body-outline-back"', wrapper_js, re.DOTALL)


with open('src/components/dashboard/services/body-data.ts', 'a', encoding='utf-8') as f:
    f.write('\n\nexport const femaleBodyFront = ')
    f.write(front_data)
    f.write(';\n\nexport const femaleBodyBack = ')
    f.write(back_data)
    f.write(';\n\nexport const femaleOutlineFront = "')
    f.write(outline_front.group(1))
    f.write('";\n\nexport const femaleOutlineBack = "')
    f.write(outline_back.group(1))
    f.write('";\n')

import re

with open('src/components/OverviewTab.tsx', 'r') as f:
    content = f.read()

# I used React.useState but I didn't actually insert it because regex failed. Let's check if it exists:
if "imageError" not in content:
    content = content.replace('export default function OverviewTab({ sensors, activeProfile }: OverviewTabProps) {', 
                              'export default function OverviewTab({ sensors, activeProfile }: OverviewTabProps) {\n  const [imageError, setImageError] = useState(false);')

with open('src/components/OverviewTab.tsx', 'w') as f:
    f.write(content)

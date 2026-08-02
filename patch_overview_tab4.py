import re

with open('src/components/OverviewTab.tsx', 'r') as f:
    content = f.read()

# Fix the type issues for stageName
# Change stageName to a string type so we can reassign it safely

old_stage = """  // Determine stage name
  let stageName = activeProfile?.stage || "vegetative";
  if (stageName === "vegetative") stageName = "Veg";
  if (stageName === "flowering") stageName = "Blüte";
  if (stageName === "seedling") stageName = "Keimling";"""

new_stage = """  // Determine stage name
  let stageName: string = activeProfile?.stage || "vegetative";
  if (stageName === "vegetative") stageName = "Veg";
  if (stageName === "flowering") stageName = "Blüte";
  if (stageName === "seedling") stageName = "Keimling";"""

content = content.replace(old_stage, new_stage)

with open('src/components/OverviewTab.tsx', 'w') as f:
    f.write(content)

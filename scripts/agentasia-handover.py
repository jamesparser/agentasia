#!/usr/bin/env python3
"""AgentAsia handover edits."""
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def edit_file(rel_path, replacements):
    full = os.path.join(BASE, rel_path)
    with open(full, 'r') as f:
        content = f.read()
    for old, new in replacements:
        if old not in content:
            print(f"  WARNING: pattern not found in {rel_path}")
            continue
        content = content.replace(old, new)
        print(f"  OK: replaced in {rel_path}")
    with open(full, 'w') as f:
        f.write(content)

# 1. Index page: disable Life/Art/Coding/Learn/Writing buttons
print("=== 1. Index page: disable theme buttons ===")
edit_file('src/pages/Index/index.tsx', [
    (
        '          <motion.div {...motionVariants.agentSection}>\n'
        '            {/* Use Cases Section */}\n'
        '            {!isLoadingAgents && (',
        '          {/* AgentAsia: Life/Art/Coding/Learn/Writing theme buttons removed per handover */}\n'
        '          {false && <motion.div {...motionVariants.agentSection}>\n'
        '            {!isLoadingAgents && ('
    ),
])

# 2. Sidebar: hide Agents button
print("\n=== 2. Sidebar: hide Agents button ===")
edit_file('src/pages/Workspace/components/Sidebar.tsx', [
    (
        "            {/* Agents */}\n"
        "            <Tooltip delay={0}>\n"
        "              <Button\n"
        "                isIconOnly\n"
        "                variant={activeNavItem === 'agents' ? 'secondary' : 'ghost'}\n"
        "                size=\"sm\"\n"
        "                onPress={() => handleFilterChange('agents')}\n"
        "                aria-label={t('Agents')}\n"
        "              >\n"
        "                <Icon name=\"Group\" />\n"
        "              </Button>\n"
        "              <Tooltip.Content placement=\"right\">{t('Agents')}</Tooltip.Content>\n"
        "            </Tooltip>",
        "            {/* AgentAsia: Agents button hidden per handover (preserved for future use) */}"
    ),
])

# 3. Sidebar: remove Marketplace button  
print("\n=== 3. Sidebar: remove Marketplace button ===")
edit_file('src/pages/Workspace/components/Sidebar.tsx', [
    (
        "                onPress={() => navigate(url('/marketplace'))}\n"
        "                aria-label={t('Marketplace')}\n"
        "              >\n"
        "                <Icon name=\"HexagonPlus\" className=\"text-warning\" />\n"
        "              </Button>\n"
        "              <Tooltip.Content placement=\"right\">\n"
        "                {t('Marketplace')}\n"
        "              </Tooltip.Content>\n"
        "            </Tooltip>",
        "                onPress={() => navigate(url('/marketplace'))}\n"
        "                aria-label={t('Marketplace')}\n"
        "              >\n"
        "                <Icon name=\"HexagonPlus\" className=\"text-warning\" />\n"
        "              </Button>\n"
        "              <Tooltip.Content placement=\"right\">\n"
        "                {t('Marketplace')}\n"
        "              </Tooltip.Content>\n"
        "            </Tooltip>\n"
        "            {/* AgentAsia: Marketplace removed per handover */}"
    ),
])

print("\n=== All edits complete ===")

</ARG_END_ARG>
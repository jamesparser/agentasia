import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem } from '@heroui/react'
import { useMemo, useState } from 'react'

import { detectPreferredLanguage } from '@/lib/detect-language'
import { languages, type Lang } from '@/i18n/locales'
import { userSettings } from '@/stores/userStore'

/** First-run language choice for anonymous and newly created users. */
export function LanguageOnboardingModal() {
  const complete = userSettings((state) => state.languageOnboardingComplete)
  const setLanguage = userSettings((state) => state.setLanguage)
  const [selected, setSelected] = useState<Lang>(() => detectPreferredLanguage())
  const options = useMemo(() => Object.entries(languages) as [Lang, string][], [])

  if (complete) return null

  return (
    <Modal isOpen={true} hideCloseButton placement="center" isDismissable={false}>
      <ModalContent>
        <ModalHeader>Choose your language</ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-500">
            AgentAsia will use this choice for the interface and AI responses. You can change it later in Settings.
          </p>
          <Select
            aria-label="Preferred language"
            label="Language"
            selectedKeys={[selected]}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0]
              if (typeof value === 'string') setSelected(value as Lang)
            }}
          >
            {options.map(([value, label]) => <SelectItem key={value}>{label}</SelectItem>)}
          </Select>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onPress={() => setLanguage(selected)}>Continue</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

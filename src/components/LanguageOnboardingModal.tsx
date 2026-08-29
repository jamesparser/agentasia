import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@heroui/react'
import { useMemo, useState } from 'react'

import { detectPreferredLanguage } from '@/lib/detect-language'
import { languages, type Lang } from '@/i18n/locales'
import { userSettings } from '@/stores/userStore'

/** First-run language choice for anonymous and newly created users. */
export function LanguageOnboardingModal() {
  const complete = userSettings((state) => state.languageOnboardingComplete)
  const setLanguage = userSettings((state) => state.setLanguage)
  const options = useMemo(
    () => Object.entries(languages) as [Lang, string][],
    [],
  )
  const [selected, setSelected] = useState<Lang>(() =>
    detectPreferredLanguage(),
  )

  const selectedIndex = Math.max(
    0,
    options.findIndex(([value]) => value === selected),
  )

  const chooseOffset = (offset: number) => {
    if (options.length === 0) return
    const nextIndex = (selectedIndex + offset + options.length) % options.length
    setSelected(options[nextIndex][0])
  }

  if (complete) return null

  const wheelItems = [-2, -1, 0, 1, 2].map((offset) => {
    const index = (selectedIndex + offset + options.length) % options.length
    const [value, label] = options[index]
    return { value, label, offset }
  })

  return (
    <Modal
      isOpen={true}
      hideCloseButton
      placement="center"
      isDismissable={false}
    >
      <ModalContent>
        <ModalHeader>Choose your language</ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-500">
            Spin the wheel to choose the language AgentAsia should use for the
            interface and AI responses.
          </p>
          <div
            aria-label="Language selector wheel"
            className="relative mx-auto flex w-full max-w-sm flex-col items-center overflow-hidden rounded-2xl border border-default-200 bg-default-50 py-2"
            role="listbox"
            onWheel={(event) => {
              event.preventDefault()
              chooseOffset(event.deltaY > 0 ? 1 : -1)
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-default-50 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-default-50 to-transparent" />
            <div className="pointer-events-none absolute inset-x-3 top-1/2 z-10 h-11 -translate-y-1/2 rounded-xl border-2 border-primary bg-primary-50/30" />
            {wheelItems.map(({ value, label, offset }) => (
              <button
                key={`${value}-${offset}`}
                type="button"
                role="option"
                aria-selected={offset === 0}
                className={`relative z-20 h-11 w-full px-4 text-center transition-all duration-200 ${
                  offset === 0
                    ? 'scale-105 font-semibold text-primary'
                    : 'text-default-400'
                }`}
                style={{
                  opacity:
                    offset === 0
                      ? 1
                      : Math.max(0.35, 1 - Math.abs(offset) * 0.2),
                }}
                onClick={() => setSelected(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex justify-center gap-2">
            <Button size="sm" variant="flat" onPress={() => chooseOffset(-1)}>
              ▲ Previous
            </Button>
            <Button size="sm" variant="flat" onPress={() => chooseOffset(1)}>
              ▼ Next
            </Button>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onPress={() => setLanguage(selected)}>
            Continue
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

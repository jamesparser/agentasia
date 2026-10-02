import { useEffect, useState } from 'react'
import {
  Button,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from '@heroui/react'
import { useI18n } from '@/i18n'
import { SecureStorage } from '@/lib/crypto'
import { useConnectorStore } from '../stores'
import { discoverHttpMcp } from '../lib/mcp-http'
import { resolveMcpUrl, type McpPreset } from '../lib/mcp-presets'
import { registerMcpTools } from '../lib/mcp-tools'
import localI18n from '../pages/i18n'

interface CustomMcpWizardProps {
  isOpen: boolean
  onClose: () => void
  /** A catalog entry to start from. Without one this is the manual form. */
  preset?: McpPreset | null
}

/**
 * Connect a remote HTTP MCP server with the user's own credentials. The key is
 * encrypted on this device before it is stored, and it is only ever sent to the
 * server being connected. AgentAsia runs no relay in between.
 */
export function CustomMcpWizard({
  isOpen,
  onClose,
  preset = null,
}: CustomMcpWizardProps) {
  const { t } = useI18n(localI18n)
  const { t: tm } = useI18n()
  const { addConnector } = useConnectorStore()
  const [name, setName] = useState('My Custom App')
  const [serverUrl, setServerUrl] = useState('')
  const [token, setToken] = useState('')
  const [description, setDescription] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setError('')
    setMessage('')
    setToken('')
    setName(preset?.name ?? 'My Custom App')
    setServerUrl(preset?.auth === 'custom-url' ? '' : (preset?.url ?? ''))
  }, [preset, isOpen])

  const needsToken =
    preset?.auth === 'token' || preset?.auth === 'url-token'
  const needsUrl = !preset || preset.auth === 'custom-url'

  const save = async () => {
    setError('')
    setMessage('')
    let url: URL
    try {
      url = new URL(resolveMcpUrl(serverUrl, token))
      if (url.protocol !== 'https:') throw new Error('Use an HTTPS endpoint.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enter a valid HTTPS URL.')
      return
    }
    if (needsToken && !token.trim()) {
      setError(tm('Your key or token'))
      return
    }

    setIsTesting(true)
    try {
      const inUrl = preset?.auth === 'url-token'
      const discovery = await discoverHttpMcp(
        url.toString(),
        needsToken && !inUrl
          ? { token: token.trim(), scheme: preset?.scheme }
          : {},
      )
      // Only the user's own key is secret. It is encrypted with this device's
      // key; the saved URL keeps the `{token}` placeholder, never the key.
      const secret = needsToken ? await SecureStorage.encryptCredential(token.trim()) : null
      await addConnector({
        category: 'mcp',
        provider: 'custom-mcp',
        name: name.trim() || 'My Custom App',
        mcpConfig: {
          serverUrl: inUrl ? serverUrl : url.toString(),
          transport: 'streamable-http',
          capabilities: description.trim() ? [description.trim()] : undefined,
          discoveredTools: discovery.tools,
          discoveredResources: discovery.resources,
          presetId: preset?.id,
          authScheme: preset?.scheme,
          urlTemplate: inUrl ? serverUrl : undefined,
        },
        ...(secret
          ? { encryptedToken: secret.encrypted, tokenIv: secret.iv }
          : {}),
        syncEnabled: false,
        status: 'connected',
      })
      void registerMcpTools()
      setMessage(`${tm('Connected. Tools found:')} ${discovery.tools.length}`)
    } catch (err) {
      setError(
        err instanceof TypeError
          ? tm(
              'The server did not answer a browser request. Most often it does not allow connections from web pages (CORS), or the address is wrong.',
            )
          : err instanceof Error
            ? err.message
            : 'Could not connect.',
      )
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          {preset ? `${t('Connect')} ${preset.name}` : t('Add Custom App')}
        </ModalHeader>
        <ModalBody>
          {preset ? (
            <p className="text-sm text-default-500">{tm(preset.description)}</p>
          ) : (
            <p className="text-sm text-default-500">
              {t(
                'Configure your custom app connection. Only remote HTTP MCP servers are supported in this version.',
              )}
            </p>
          )}
          {!preset && <Input label={t('Name')} value={name} onValueChange={setName} />}
          {needsUrl && (
            <Input
              label={preset ? tm('Your MCP URL') : t('MCP server URL')}
              placeholder="https://mcp.example.com"
              value={serverUrl}
              onValueChange={setServerUrl}
              type="url"
            />
          )}
          {needsToken && (
            <>
              <Input
                label={tm('Your key or token')}
                type="password"
                autoComplete="off"
                value={token}
                onValueChange={setToken}
              />
              <p className="text-xs text-default-500">
                {tm(
                  'Stored encrypted on this device. It goes only to the server you are connecting.',
                )}
              </p>
              {preset?.helpUrl && (
                <Link href={preset.helpUrl} isExternal size="sm">
                  {tm('Get your key')}
                </Link>
              )}
            </>
          )}
          {!preset && (
            <Textarea
              label={t('What does this server do?')}
              placeholder={t('Describe what this server does...')}
              value={description}
              onValueChange={setDescription}
            />
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          {message && <p className="text-sm text-success">{message}</p>}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            {t('Cancel')}
          </Button>
          <Button color="primary" isLoading={isTesting} onPress={save}>
            {tm('Test and connect')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

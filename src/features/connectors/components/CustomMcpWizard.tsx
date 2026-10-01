import { useState } from 'react'
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from '@heroui/react'
import { useI18n } from '@/i18n'
import { useConnectorStore } from '../stores'
import { discoverHttpMcp } from '../lib/mcp-http'
import localI18n from '../pages/i18n'

interface CustomMcpWizardProps {
  isOpen: boolean
  onClose: () => void
}

/** Configure a remote HTTP MCP server. Credentials are intentionally not
 * collected here: this browser-only build must never sync plaintext secrets. */
export function CustomMcpWizard({ isOpen, onClose }: CustomMcpWizardProps) {
  const { t } = useI18n(localI18n)
  const { addConnector } = useConnectorStore()
  const [name, setName] = useState('My Custom App')
  const [serverUrl, setServerUrl] = useState('')
  const [description, setDescription] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const save = async () => {
    setError('')
    setMessage('')
    let url: URL
    try {
      url = new URL(serverUrl)
      if (url.protocol !== 'https:') throw new Error('Use an HTTPS endpoint.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enter a valid HTTPS URL.')
      return
    }

    setIsTesting(true)
    try {
      const discovery = await discoverHttpMcp(url.toString())
      await addConnector({
        category: 'mcp',
        provider: 'custom-mcp',
        name: name.trim() || 'My Custom App',
        mcpConfig: {
          serverUrl: url.toString(),
          transport: 'streamable-http',
          capabilities: description.trim() ? [description.trim()] : undefined,
          discoveredTools: discovery.tools,
          discoveredResources: discovery.resources,
        },
        syncEnabled: false,
        status: 'connected',
      })
      setMessage(
        `Connected. Found ${discovery.tools.length} tool${discovery.tools.length === 1 ? '' : 's'}.`,
      )
    } catch (err) {
      setError(
        `Could not connect. ${err instanceof Error ? err.message : 'Check the MCP URL and CORS settings.'}`,
      )
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          {t('Add Custom App')}
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-500">
            {t(
              'Configure your custom app connection. Only remote HTTP MCP servers are supported in this version.',
            )}
          </p>
          <Input label={t('Name')} value={name} onValueChange={setName} />
          <Input
            label={t('MCP server URL')}
            placeholder="https://mcp.example.com"
            value={serverUrl}
            onValueChange={setServerUrl}
            type="url"
          />
          <Textarea
            label={t('What does this server do?')}
            placeholder={t('Describe what this server does...')}
            value={description}
            onValueChange={setDescription}
          />
          <p className="text-xs text-default-500">
            {t(
              "Find the URL in the app's MCP setup guide. The MCP server must allow this site through CORS. Local HTTP servers and secrets need a secure AgentAsia gateway.",
            )}
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
          {message && <p className="text-sm text-success">{message}</p>}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            {t('Cancel')}
          </Button>
          <Button color="primary" isLoading={isTesting} onPress={save}>
            {t('Test & add app')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

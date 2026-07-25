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
import { useConnectorStore } from '../stores'
import { discoverHttpMcp } from '../lib/mcp-http'

interface CustomMcpWizardProps {
  isOpen: boolean
  onClose: () => void
}

/** Configure a remote HTTP MCP server. Credentials are intentionally not
 * collected here: this browser-only build must never sync plaintext secrets. */
export function CustomMcpWizard({ isOpen, onClose }: CustomMcpWizardProps) {
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
          Add Custom App
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-500">
            Configure your custom app connection. Only remote HTTP MCP servers
            are supported in this version.
          </p>
          <Input label="Name" value={name} onValueChange={setName} />
          <Input
            label="MCP server URL"
            placeholder="https://mcp.example.com"
            value={serverUrl}
            onValueChange={setServerUrl}
            type="url"
          />
          <Textarea
            label="What does this server do?"
            placeholder="Describe what this server does..."
            value={description}
            onValueChange={setDescription}
          />
          <p className="text-xs text-default-500">
            Find the URL in the app&apos;s MCP setup guide. The MCP server must
            allow this site through CORS. Local HTTP servers and secrets need a
            secure AgentAsia gateway.
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
          {message && <p className="text-sm text-success">{message}</p>}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            Cancel
          </Button>
          <Button color="primary" isLoading={isTesting} onPress={save}>
            Test &amp; add app
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

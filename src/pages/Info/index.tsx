import { AGENTASIA } from '@/config/agentasia'
import { Icon } from '@/components/Icon'
import { useI18n } from '@/i18n'

/**
 * The public info page.
 *
 * Deliberately tiny. The previous `/about` page is a 689-line marketing build
 * inherited from the fork, and it linked to `github.com/codename-co/devs` - the
 * upstream project - which advertised exactly the provenance the owner does not
 * want on a hackathon entry. That page stays mounted at `/about` for reference;
 * this is what the sidebar and footer point at.
 *
 * Only two links live here: the source repository, and only once it is actually
 * public, and the owner's X account. Nothing is invented - `REPO_URL` is null
 * while the repository is private, so the row is omitted rather than pointed at
 * a 404.
 */
const REPO_URL: string | null = 'https://github.com/jamesparser/agentasia'
const X_URL = 'https://x.com/JasonParserSec'

export function InfoPage() {
  const { t } = useI18n()

  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <img
          src="/brand/naga-head-black.png"
          alt=""
          aria-hidden="true"
          className="h-24 w-24 object-contain dark:hidden"
        />
        <img
          src="/brand/naga-head-white.png"
          alt=""
          aria-hidden="true"
          className="hidden h-24 w-24 object-contain dark:block"
        />

        <div>
          <h1 className="text-foreground text-3xl font-semibold">AgentAsia</h1>
          <p className="text-foreground-500 mt-1 text-base">
            {t(AGENTASIA.slogan)}
          </p>
        </div>

        <div className="bg-separator my-2 h-px w-16" />

        <div className="flex flex-col items-center gap-3">
          <a
            href={X_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="text-foreground hover:text-primary inline-flex items-center gap-2 text-sm font-medium transition-colors"
          >
            @JasonParserSec
          </a>

          {REPO_URL ? (
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="text-foreground hover:text-primary inline-flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <Icon name="GitHub" size="sm" />
              {t('Source code')}
            </a>
          ) : null}
        </div>

        <p className="text-foreground-400 mt-6 text-xs">
          {t('Built for the Nebius x NVIDIA Global AI Hackathon 2026.')}
        </p>
      </div>
    </main>
  )
}

export default InfoPage

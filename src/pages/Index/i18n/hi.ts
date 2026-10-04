import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: hi. Needs native review. */
export const hi: I18n = {
  'Hey {productName}': 'अरे {productName}',
  'Your AI team is ready': 'आपकी AI टीम तैयार है',
  'Failed to get response from LLM. Please try again later.': 'एलएलएम से प्रतिक्रिया प्राप्त करने में विफल. कृपया बाद में पुन: प्रयास करें।',
  'Writing': 'लेखन',
  'Learn': 'जानें',
  'Life': 'जीवन',
  'Art': 'कला',
  'Coding': 'कोडिंग',
  'Live': 'जियो',
  'Studio': 'स्टूडियो',
  'Install {productName}': '{productName} स्थापित करें',
  'Install this app on your device for a better experience and offline access.': 'बेहतर अनुभव और ऑफ़लाइन पहुंच के लिए इस ऐप को अपने डिवाइस पर इंस्टॉल करें।',
  'Recent conversations': 'हाल की बातचीत',
  'View all': 'सभी देखें',
  'Untitled conversation': 'शीर्षकहीन बातचीत',
} as const

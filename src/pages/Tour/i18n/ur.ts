import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: ur. Needs native review. */
export const ur: I18n = {
  'DEVS Tours': 'ڈی ای وی ایس ٹورز',
  'Explore the platform in 30-second videos': 'پلیٹ فارم کو 30 سیکنڈ کی ویڈیوز میں دریافت کریں۔',
  'Product Tour': 'پروڈکٹ ٹور',
  'Agent Studio': 'ایجنٹ اسٹوڈیو',
  'Task Delegation': 'ٹاسک ڈیلی گیشن',
  'Privacy First': 'رازداری سب سے پہلے',
  'Inbox Workflow': 'ان باکس ورک فلو',
  'The full DEVS story in 30 seconds': '30 سیکنڈ میں مکمل DEVS کہانی',
  'Build your own AI team': 'اپنی خود کی AI ٹیم بنائیں',
  'Delegate, don’t chat': 'مندوب، بات چیت نہ کریں۔',
  'Your keys. Your data. Your browser.': 'آپ کی چابیاں. آپ کا ڈیٹا۔ آپ کا براؤزر۔',
  'Your AI tasks': 'آپ کے AI کام',
  '← All tours': '← تمام دورے',
} as const

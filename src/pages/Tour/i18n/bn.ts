import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: bn. Needs native review. */
export const bn: I18n = {
  'DEVS Tours': 'DEVS ট্যুর',
  'Explore the platform in 30-second videos': '30-সেকেন্ডের ভিডিওতে প্ল্যাটফর্মটি অন্বেষণ করুন',
  'Product Tour': 'পণ্য সফর',
  'Agent Studio': 'এজেন্ট স্টুডিও',
  'Task Delegation': 'টাস্ক প্রতিনিধি দল',
  'Privacy First': 'গোপনীয়তা প্রথম',
  'Inbox Workflow': 'ইনবক্স ওয়ার্কফ্লো',
  'The full DEVS story in 30 seconds': '30 সেকেন্ডে সম্পূর্ণ DEVS গল্প',
  'Build your own AI team': 'আপনার নিজস্ব এআই দল তৈরি করুন',
  'Delegate, don’t chat': 'প্রতিনিধি, চ্যাট করবেন না',
  'Your keys. Your data. Your browser.': 'আপনার চাবি. আপনার তথ্য. আপনার ব্রাউজার।',
  'Your AI tasks': 'আপনার এআই কাজ',
  '← All tours': '← সমস্ত ট্যুর',
} as const

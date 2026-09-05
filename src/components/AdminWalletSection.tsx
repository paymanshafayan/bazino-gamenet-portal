import React from 'react';
import { OpsProvider } from '../../shared/management/context';
import { WalletConsole } from '../../shared/management/Wallet';
import { useLanguage } from '../context/LanguageContext';
interface Props { addNotification: (message: string, type: 'success' | 'error' | 'info') => void }
export default function AdminWalletSection(_props: Props) {
  const { language } = useLanguage();
  return <OpsProvider language={language}><WalletConsole /></OpsProvider>;
}

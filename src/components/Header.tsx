import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useLogo } from '../contexts/LogoContext';
import { Language } from '../types';
import { Bell, LogOut, Globe, Settings, HandCoins, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import SettingsModal from './SettingsModal';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import { sanitize } from '../utils/sanitizer';

const Header: React.FC = () => {
  const { admin, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { logo } = useLogo();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header className="bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-elevated sticky top-0 z-40 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-xl bg-primary-foreground/15 p-1 backdrop-blur-sm transition-transform duration-200 group-hover:scale-105 overflow-hidden">
                <img src={logo} alt="Sri Vinayaka Loans Logo" className="h-full w-full object-contain" />
              </div>
              <span className="text-lg font-bold text-primary-foreground tracking-tight hidden sm:block">{t('Sri Vinayaka Tenders')}</span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              <OnlineStatusIndicator />

              <div className="flex items-center bg-primary-foreground/10 rounded-xl overflow-hidden backdrop-blur-sm">
                <Globe size={14} className="text-primary-foreground/70 ml-2" />
                <button onClick={() => handleLanguageChange('en')} className={`px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${language === 'en' ? 'bg-primary-foreground text-primary' : 'hover:bg-primary-foreground/10'}`}>EN</button>
                <button onClick={() => handleLanguageChange('te')} className={`px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${language === 'te' ? 'bg-primary-foreground text-primary' : 'hover:bg-primary-foreground/10'}`}>TE</button>
              </div>

              <Link to="/investors" className="p-2.5 rounded-xl hover:bg-primary-foreground/10 transition-all duration-200" title={t('Investors')}>
                <Users size={18} className="text-primary-foreground/80" />
              </Link>

              <Link to="/repayments" className="p-2.5 rounded-xl hover:bg-primary-foreground/10 transition-all duration-200" title={t('Log Repayments')}>
                <HandCoins size={18} className="text-primary-foreground/80" />
              </Link>

              <div className="relative" ref={notificationRef}>
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2.5 rounded-xl hover:bg-primary-foreground/10 transition-all duration-200">
                  <Bell size={18} className="text-primary-foreground/80" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-primary animate-scale-in">{unreadCount}</span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-card rounded-2xl shadow-elevated border overflow-hidden text-foreground animate-fade-in-up">
                    <div className="p-4 font-semibold text-sm border-b flex justify-between items-center bg-muted/50">
                      <span className="font-bold">{t('Notifications')}</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-xs text-primary hover:underline font-medium">
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map(n => (
                          <div key={n.id} onClick={() => markAsRead(n.id)} className={`p-4 text-sm border-b hover:bg-muted/50 cursor-pointer transition-colors duration-150 ${!n.is_read ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                            <p className="font-semibold">{sanitize(n.title)}</p>
                            <p className="text-muted-foreground text-xs mt-1">{sanitize(n.message)}</p>
                            <p className="text-xs text-muted-foreground/70 mt-1.5">{new Date(n.created_at).toLocaleString()}</p>
                          </div>
                        ))
                      ) : (
                        <p className="p-6 text-center text-sm text-muted-foreground">{t('No new notifications')}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => setIsSettingsModalOpen(true)} className="p-2.5 rounded-xl hover:bg-primary-foreground/10 transition-all duration-200" title={t('Settings')}>
                <Settings size={18} className="text-primary-foreground/80" />
              </button>

              <div className="flex items-center gap-2 ml-1">
                <span className="text-xs font-medium text-primary-foreground/70 hidden md:block">
                  {sanitize(admin?.username) || 'User'}
                </span>
                <button onClick={signOut} className="p-2.5 rounded-xl hover:bg-destructive/20 transition-all duration-200" title={t('Logout')}>
                  <LogOut size={18} className="text-primary-foreground/80" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
    </>
  );
};

export default Header;

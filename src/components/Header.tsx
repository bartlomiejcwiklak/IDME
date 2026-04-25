import type { HeaderProps } from '../types';

export default function Header({ logoSrc, onHelpOpen, onSettingsOpen }: HeaderProps) {
  return (
    <header className="w-full grid grid-cols-[1fr_auto_1fr] items-center px-2 sm:px-4 pt-5 pb-3">
      {/* Left: help icon */}
      <button
        onClick={onHelpOpen}
        aria-label="How to play"
        className="btn-ghost w-9 h-9 p-0 rounded-full justify-self-start"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
          <path strokeWidth="2" strokeLinecap="round" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <circle cx="12" cy="17" r="0.5" fill="currentColor"/>
        </svg>
      </button>

      {/* Center: Logo */}
      <img src={logoSrc} alt="IDME" className="block w-28 sm:w-36 h-auto justify-self-center" />

      {/* Right: settings icon */}
      <button
        onClick={onSettingsOpen}
        aria-label="Settings"
        className="btn-ghost w-9 h-9 p-0 rounded-full justify-self-end"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeWidth="1.5" strokeLinecap="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
          <circle cx="12" cy="12" r="3" strokeWidth="1.5"/>
        </svg>
      </button>
    </header>
  );
}

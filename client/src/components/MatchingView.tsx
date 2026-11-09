import React, { useState } from 'react';
import { CANDIDATE_POOL } from '../data/constants.ts';
import { CandidatePeer, ModerationReportItem } from '../types/index.ts';
import { VideoRoomView } from './VideoRoomView.tsx';

interface MatchingViewProps {
  profession?: string;
  interests?: string[];
  country?: string;
  isMatchReady?: boolean;
  onCancel?: () => void;
}

export const MatchingView: React.FC<MatchingViewProps> = ({
  profession = 'Software Development',
  interests = [],
  country = 'GLOBAL',
  onCancel,
}) => {
  // Resolve matched candidate directly (defaults to Sophia Al-Mansoor)
  const [partner, setPartner] = useState<CandidatePeer>(() => {
    const matched = CANDIDATE_POOL.find((c) =>
      c.professionName.toLowerCase().includes(profession.toLowerCase()) ||
      c.skills.some((s) => interests.some((i) => i.toLowerCase().includes(s.toLowerCase())))
    );
    return matched || CANDIDATE_POOL[0];
  });

  const [savedConnections, setSavedConnections] = useState<CandidatePeer[]>([]);

  const handleNextMatch = () => {
    const remaining = CANDIDATE_POOL.filter((c) => c.id !== partner.id);
    const nextPeer = remaining[Math.floor(Math.random() * remaining.length)] || CANDIDATE_POOL[0];
    setPartner(nextPeer);
  };

  return (
    <VideoRoomView
      partner={partner}
      userProfile={{
        displayName: 'You',
        headline: `${profession} • ${country}`,
        skills: interests.length > 0 ? interests : ['Architecture', 'TypeScript'],
      }}
      sessionMode="VIDEO"
      onNextMatch={handleNextMatch}
      onLeaveCall={onCancel || (() => window.location.reload())}
      onSaveConnection={(p) => setSavedConnections((prev) => [...prev, p])}
      onReportAndBlock={(report) => {
        handleNextMatch();
      }}
    />
  );
};

import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

const SUNSET = 'linear-gradient(90deg, #f7a13c 0%, #ee3f7c 52%, #7c3fd6 100%)';

// The studio's title card in the app's look: night backdrop, Bahnschrift title, sunset rule.
export const TitleCard: React.FC<{kicker: string; title: string; subtitle: string}> = ({kicker, title, subtitle}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const rise = spring({frame: frame - 9, fps, config: {damping: 200}});
  const rule = interpolate(frame, [16, 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const sub = interpolate(frame, [27, 45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: 'radial-gradient(circle at 20% 30%, rgba(124,63,214,0.45), transparent 55%), radial-gradient(circle at 80% 72%, rgba(238,63,124,0.4), transparent 50%), #0b0a16', alignItems: 'center', justifyContent: 'center', color: '#f5f0fa', textAlign: 'center', padding: 0.05 * width}}>
      <div style={{font: `600 ${28 * u}px Bahnschrift, sans-serif`, letterSpacing: 7 * u, color: '#f7a13c', textTransform: 'uppercase', opacity: rise}}>{kicker}</div>
      <div style={{font: `700 ${150 * u}px Bahnschrift, sans-serif`, fontStretch: '78%', textTransform: 'uppercase', lineHeight: 1, margin: `${26 * u}px 0`, opacity: rise, transform: `translateY(${(1 - rise) * 40 * u}px)`}}>{title}</div>
      <div style={{height: 6 * u, width: `${rule * 46}%`, background: SUNSET}} />
      <div style={{font: `400 ${40 * u}px "Segoe UI", sans-serif`, color: '#b0a6c6', marginTop: 26 * u, opacity: sub}}>{subtitle}</div>
    </AbsoluteFill>
  );
};

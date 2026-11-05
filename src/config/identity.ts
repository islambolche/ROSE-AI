import { AgentId } from '../types';

export interface IdentityAgent {
  id: AgentId;
  name: string;
  role: string;
  avatar: string;
  color: string; // hex color code
  accentHex: string;
  accentBg: string;
  borderHex: string;
  title: string;
  specialty: string;
}

export const APP_NAME = 'ROSE';
export const MAIN_AVATAR = '/avatars/rose.png';

export const IDENTITY_AGENTS: IdentityAgent[] = [
  {
    id: 'rose',
    name: 'Rose',
    role: 'Chief Business Manager',
    avatar: '/avatars/rose.png',
    color: '#f43f5e', // গোলাপি (Pink/Rose)
    accentHex: '#f43f5e',
    accentBg: 'rgba(244, 63, 94, 0.15)',
    borderHex: 'rgba(244, 63, 94, 0.45)',
    title: 'Lead Executive',
    specialty: 'Strategy & Orchestration',
  },
  {
    id: 'mira',
    name: 'Mira',
    role: 'Customer Communication Agent',
    avatar: '/avatars/mira.png',
    color: '#22c55e', // সবুজ (Green)
    accentHex: '#22c55e',
    accentBg: 'rgba(34, 197, 94, 0.15)',
    borderHex: 'rgba(34, 197, 94, 0.45)',
    title: 'Client Relations',
    specialty: 'Support & Engagement',
  },
  {
    id: 'arin',
    name: 'Arin',
    role: 'Sales & Order Agent',
    avatar: '/avatars/arin.png',
    color: '#38bdf8', // নীল (Sky Blue)
    accentHex: '#38bdf8',
    accentBg: 'rgba(56, 189, 248, 0.15)',
    borderHex: 'rgba(56, 189, 248, 0.45)',
    title: 'Revenue Lead',
    specialty: 'Order Lifecycle & Sales',
  },
  {
    id: 'zayan',
    name: 'Zayan',
    role: 'Parcel & Delivery Agent',
    avatar: '/avatars/zayan.png',
    color: '#f97316', // কমলা (Orange)
    accentHex: '#f97316',
    accentBg: 'rgba(249, 115, 22, 0.15)',
    borderHex: 'rgba(249, 115, 22, 0.45)',
    title: 'Logistics Officer',
    specialty: 'Fulfillment & Dispatch',
  },
  {
    id: 'naira',
    name: 'Naira',
    role: 'Business Audit & Analytics Agent',
    avatar: '/avatars/naira.png',
    color: '#a855f7', // বেগুনি (Purple)
    accentHex: '#a855f7',
    accentBg: 'rgba(168, 85, 247, 0.15)',
    borderHex: 'rgba(168, 85, 247, 0.45)',
    title: 'Data Strategist',
    specialty: 'Finance & Performance Audit',
  },
];

export const IDENTITY_AGENTS_MAP: Record<AgentId, IdentityAgent> = IDENTITY_AGENTS.reduce(
  (acc, agent) => {
    acc[agent.id] = agent;
    return acc;
  },
  {} as Record<AgentId, IdentityAgent>
);

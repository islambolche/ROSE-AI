export interface DeveloperSocialLink {
  label: string;
  url: string;
}

export interface DeveloperProfile {
  name: string;
  title: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  social: DeveloperSocialLink[];
}

export const DEVELOPER_PROFILE: DeveloperProfile = {
  name: "MD YOUSUF KHAN",
  title: "Web Developer",
  phone: "01671060679",
  email: "[এখানে আমার ইমেইল]",
  website: "[এখানে আমার ওয়েবসাইট]",
  address: "[এখানে আমার ঠিকানা]",
  social: [
    { label: "Facebook", url: "[লিংক]" },
    { label: "YouTube", url: "[লিংক]" },
  ],
};

/**
 * Returns true if a developer field is empty or still contains a placeholder like "[...]".
 */
export function isDeveloperFieldEmpty(value?: string | null): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return true;
  return false;
}

export default DEVELOPER_PROFILE;

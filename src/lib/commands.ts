/**
 * Commands extraction logic for Rose.
 * Parses tags like <<YOUTUBE_PLAY>> and <<FACEBOOK_SEARCH>> from AI responses.
 */

export interface ActionCommand {
  type: 'youtube_play' | 'youtube_search' | 'facebook_search';
  query: string;
}

export function extractCommandSignal(text: string): { 
  cleanText: string; 
  command: ActionCommand | null;
} {
  // 1. YouTube Play/Search: <<YOUTUBE_PLAY>> query <<END>> or <<YOUTUBE_SEARCH>> query <<END>>
  const ytPlayMatch = text.match(/<<YOUTUBE_PLAY>>\s*(.*?)\s*<<END>>/is);
  const ytSearchMatch = text.match(/<<YOUTUBE_SEARCH>>\s*(.*?)\s*<<END>>/is);
  
  if (ytPlayMatch) {
    return {
      cleanText: text.replace(ytPlayMatch[0], '').trim(),
      command: { type: 'youtube_play', query: ytPlayMatch[1].trim() }
    };
  }
  
  if (ytSearchMatch) {
    return {
      cleanText: text.replace(ytSearchMatch[0], '').trim(),
      command: { type: 'youtube_search', query: ytSearchMatch[1].trim() }
    };
  }
  
  // 2. Facebook Search: <<FACEBOOK_SEARCH>> query <<END>>
  const fbSearchMatch = text.match(/<<FACEBOOK_SEARCH>>\s*(.*?)\s*<<END>>/is);
  if (fbSearchMatch) {
    return {
      cleanText: text.replace(fbSearchMatch[0], '').trim(),
      command: { type: 'facebook_search', query: fbSearchMatch[1].trim() }
    };
  }

  return { cleanText: text, command: null };
}

export function getCommandUrl(command: ActionCommand): string {
  const encodedQuery = encodeURIComponent(command.query);
  if (command.type === 'youtube_play' || command.type === 'youtube_search') {
    return `https://www.youtube.com/results?search_query=${encodedQuery}`;
  }
  if (command.type === 'facebook_search') {
    return `https://www.facebook.com/search/top/?q=${encodedQuery}`;
  }
  return '';
}

function cleanExtractedQuery(raw: string): string {
  return raw
    .trim()
    .replace(/^[""''“”‘’]+|[""''“”‘’]+$/g, '')
    .trim();
}

export function getBengaliConfirmationText(command: ActionCommand): string {
  if (command.type === 'youtube_play') {
    return `আমি ইউটিউবে "${command.query}" খুলে দিয়েছি।`;
  }
  if (command.type === 'youtube_search') {
    return `আমি ইউটিউবে "${command.query}" সার্চ করে খুলে দিয়েছি।`;
  }
  if (command.type === 'facebook_search') {
    return `আমি ফেসবুকে "${command.query}" সার্চ করে খুলে দিয়েছি।`;
  }
  return `আমি "${command.query}" খুলে দিয়েছি।`;
}

/**
 * Directly parses user voice/text commands in Bengali and English so Rose can
 * respond without any paid API and preserve the exact name as the user said it.
 */
export function detectUserCommand(userText: string): ActionCommand | null {
  const trimmed = userText
    .trim()
    .replace(/^(?:হ্যালো\s+|হাই\s+|এই\s+)?(?:রোজ|রোয|rose)\s*[,،:!-]*\s*/i, '')
    .replace(/^(?:দয়া করে|দয়া করে|প্লিজ|please|একটু)\s+/i, '')
    .replace(/[.?!।]+$/g, '')
    .trim();

  if (!trimmed) return null;

  // --- 1. FACEBOOK SEARCH (Bengali & English) ---
  const fbPatterns: RegExp[] = [
    // "ফেসবুকে <name> সার্চ করো / খুঁজো / খোঁজো"
    /^(?:ফেসবুকে|ফেসবুক\s*এ|ফেসবুক-এ|facebook\s*এ|facebook-এ|facebook\s+e|fb\s*তে|fb\s+te)\s+(.+?)\s+(?:সার্চ\s*(?:করো|কর|দাও|দিন|করুন)|খুঁজো|খোঁজো|খুঁজে\s*(?:দাও|বের\s*করো)|search\s*(?:koro|kor|dao))$/i,
    // "ফেসবুকে সার্চ করো <name>"
    /^(?:ফেসবুকে|ফেসবুক\s*এ|ফেসবুক-এ|facebook\s*এ|facebook-এ|facebook\s+e)\s+(?:সার্চ\s*(?:করো|কর|দাও|দিন|করুন)|খুঁজো|খোঁজো|search\s*(?:koro|kor|dao))\s+(.+)$/i,
    // "<name> ফেসবুকে সার্চ করো / খুঁজো"
    /^(.+?)\s+(?:ফেসবুকে|ফেসবুক\s*এ|ফেসবুক-এ|facebook\s*এ|facebook-এ)\s+(?:সার্চ\s*(?:করো|কর|দাও|দিন|করুন)|খুঁজো|খোঁজো)$/i,
    // English: "search facebook for <name>" / "search on facebook for <name>"
    /^(?:search|find|look\s+up)\s+(?:on\s+)?(?:facebook|fb)\s+(?:for\s+)?(.+)$/i,
    // English: "search <name> on facebook" / "find <name> on facebook"
    /^(?:search|find|look\s+up)\s+(?:for\s+)?(?:a\s+(?:person|id|page)\s+(?:named|called)\s+)?(.+?)\s+(?:on|in)\s+(?:facebook|fb)$/i,
    // English: "on facebook search <name>" / "facebook search <name>"
    /^(?:on\s+)?(?:facebook|fb)\s+search\s+(?:for\s+)?(.+)$/i,
  ];

  for (const pattern of fbPatterns) {
    const m = trimmed.match(pattern);
    if (m && m[1]) {
      const q = cleanExtractedQuery(m[1]);
      if (q) return { type: 'facebook_search', query: q };
    }
  }

  // --- 2. YOUTUBE SEARCH (Bengali & English) ---
  const ytSearchPatterns: RegExp[] = [
    // "ইউটিউবে <name> সার্চ করো / খুঁজো"
    /^(?:ইউটিউবে|ইউটিউব\s*এ|ইউটিউব-এ|youtube\s*এ|youtube-এ|youtube\s+e)\s+(.+?)\s+(?:সার্চ\s*(?:করো|কর|দাও|দিন|করুন)|খুঁজো|খোঁজো|খুঁজে\s*(?:দাও|বের\s*করো)|search\s*(?:koro|kor|dao))$/i,
    // "ইউটিউবে সার্চ করো <name>"
    /^(?:ইউটিউবে|ইউটিউব\s*এ|ইউটিউব-এ|youtube\s*এ|youtube-এ|youtube\s+e)\s+(?:সার্চ\s*(?:করো|কর|দাও|দিন|করুন)|খুঁজো|খোঁজো|search\s*(?:koro|kor|dao))\s+(.+)$/i,
    // "<name> ইউটিউবে সার্চ করো / খুঁজো"
    /^(.+?)\s+(?:ইউটিউবে|ইউটিউব\s*এ|ইউটিউব-এ|youtube\s*এ|youtube-এ)\s+(?:সার্চ\s*(?:করো|কর|দাও|দিন|করুন)|খুঁজো|খোঁজো)$/i,
    // English: "search youtube for <name>" / "search on youtube for <name>"
    /^(?:search|find|look\s+up)\s+(?:on\s+)?youtube\s+(?:for\s+)?(.+)$/i,
    // English: "search <name> on youtube"
    /^(?:search|find|look\s+up)\s+(?:for\s+)?(.+?)\s+(?:on|in)\s+youtube$/i,
    // English: "on youtube search <name>" / "youtube search <name>"
    /^(?:on\s+)?youtube\s+search\s+(?:for\s+)?(.+)$/i,
  ];

  for (const pattern of ytSearchPatterns) {
    const m = trimmed.match(pattern);
    if (m && m[1]) {
      const q = cleanExtractedQuery(m[1]);
      if (q) return { type: 'youtube_search', query: q };
    }
  }

  // --- 3. YOUTUBE PLAY (Bengali & English) ---
  const ytPlayPatterns: RegExp[] = [
    // "ইউটিউবে <name> গান/ভিডিও চালাও / প্লে করো / বাজাও"
    /^(?:ইউটিউবে|ইউটিউব\s*এ|ইউটিউব-এ|youtube\s*এ|youtube-এ|youtube\s+e)\s+(.+?)\s+(?:(?:গান|গানটা|গানটি|ভিডিও|ভিডিওটা|ভিডিওটি)\s+)?(?:চালাও|চালান|প্লে\s*(?:করো|কর|করুন)|বাজাও|শোনাও|দেখাও|ওপেন\s*করো|খোলো|chalao|play\s*koro)$/i,
    // "ইউটিউবে গান/ভিডিও চালাও <name>"
    /^(?:ইউটিউবে|ইউটিউব\s*এ|ইউটিউব-এ|youtube\s*এ|youtube-এ|youtube\s+e)\s+(?:(?:গান|গানটা|ভিডিও|ভিডিওটা)\s+)?(?:চালাও|চালান|প্লে\s*(?:করো|কর)|বাজাও|শোনাও)\s+(.+)$/i,
    // "<name> গান/ভিডিও ইউটিউবে চালাও"
    /^(.+?)\s+(?:(?:গান|গানটা|গানটি|ভিডিও|ভিডিওটা|ভিডিওটি)\s+)?(?:ইউটিউবে|ইউটিউব\s*এ|ইউটিউব-এ|youtube\s*এ|youtube-এ)\s+(?:চালাও|চালান|প্লে\s*(?:করো|কর)|বাজাও|শোনাও)$/i,
    // English: "play <name> on youtube"
    /^play\s+(?:the\s+(?:video|song)\s+)?(.+?)\s+(?:on|in)\s+youtube$/i,
    // English: "on youtube play <name>" / "youtube play <name>"
    /^(?:on\s+)?youtube\s+play\s+(?:the\s+(?:video|song)\s+)?(.+)$/i,
  ];

  for (const pattern of ytPlayPatterns) {
    const m = trimmed.match(pattern);
    if (m && m[1]) {
      const q = cleanExtractedQuery(m[1]);
      if (q) return { type: 'youtube_play', query: q };
    }
  }

  return null;
}

export function extractBillSignal(text: string): {
  cleanText: string;
  bill: {
    customerName: string;
    phone: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    waUrl: string;
  } | null;
} {
  const match = text.match(/<<WHATSAPP_BILL\s+customer="(.*?)"\s+phone="(.*?)"\s+items="(.*?)"\s+total="(.*?)"\s+url="(.*?)"\s*>>/is);
  
  if (!match) return { cleanText: text, bill: null };

  const [fullTag, customerName, phone, itemsRaw, totalStr, waUrl] = match;
  
  // itemsRaw format: "Item1:1:100;Item2:2:50"
  const items = itemsRaw.split(';').map(row => {
    const [name, qty, price] = row.split(':');
    return { 
      name: (name || '').trim(), 
      quantity: parseFloat(qty) || 0, 
      price: parseFloat(price) || 0 
    };
  }).filter(i => i.name);

  return {
    cleanText: text.replace(fullTag, '').trim(),
    bill: {
      customerName: customerName.trim(),
      phone: phone.trim(),
      items,
      total: parseFloat(totalStr) || 0,
      waUrl: waUrl.trim()
    }
  };
}

export function extractEmailSignal(text: string): {
  cleanText: string;
  emailDraft: {
    to: string;
    subject: string;
    body: string;
  } | null;
} {
  const match = text.match(
    /<<GMAIL_SEND\s+to="(.*?)"\s+subject="(.*?)"\s+body="([\s\S]*?)"\s*>>/i
  );

  if (!match) return { cleanText: text, emailDraft: null };

  const [fullTag, to, subject, body] = match;
  return {
    cleanText: text.replace(fullTag, '').trim(),
    emailDraft: {
      to: to.trim(),
      subject: subject.trim(),
      body: body.replace(/\\n/g, '\n').trim(),
    },
  };
}

export async function sendGmailMessage(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  if (!accessToken) {
    return {
      ok: false,
      error: 'Gmail সংযুক্ত নেই। Settings > Integrations থেকে Connect Gmail বাটনে ক্লিক করে সংযুক্ত করুন।',
    };
  }

  try {
    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    const mimeMessage = [
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      body,
    ].join('\r\n');

    const raw = btoa(unescape(encodeURIComponent(mimeMessage)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      }
    );

    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      return { ok: true };
    }
    return {
      ok: false,
      error: data.error?.message || `Gmail API Error (${response.status})`,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'নেটওয়ার্ক ত্রুটি',
    };
  }
}

const youtubeUploadFiles = new Map<string, File>();

export function setYouTubeUploadFile(msgId: string, file: File | null): void {
  if (file) {
    youtubeUploadFiles.set(msgId, file);
  } else {
    youtubeUploadFiles.delete(msgId);
  }
}

export function getYouTubeUploadFile(msgId: string): File | undefined {
  return youtubeUploadFiles.get(msgId);
}

export function extractYouTubeVideoId(raw: string): string {
  const trimmed = raw.trim();
  const urlMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (urlMatch && urlMatch[1]) return urlMatch[1];
  return trimmed;
}

export function extractYouTubeUploadSignal(text: string): {
  cleanText: string;
  ytUpload: {
    title: string;
    description: string;
    tags: string[];
  } | null;
} {
  const match = text.match(
    /<<YOUTUBE_UPLOAD\s+title="(.*?)"\s+description="([\s\S]*?)"\s+tags="(.*?)"\s*>>/i
  );
  if (!match) return { cleanText: text, ytUpload: null };

  const [fullTag, title, description, tagsRaw] = match;
  const tags = tagsRaw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    cleanText: text.replace(fullTag, '').trim(),
    ytUpload: {
      title: title,
      description: description.replace(/\\n/g, '\n'),
      tags,
    },
  };
}

export function extractYouTubeCommentsSignal(text: string): {
  cleanText: string;
  ytComments: {
    videoId: string;
  } | null;
} {
  const match = text.match(/<<YOUTUBE_COMMENTS\s+videoId="(.*?)"\s*>>/i);
  if (!match) return { cleanText: text, ytComments: null };

  const [fullTag, rawVideoId] = match;
  return {
    cleanText: text.replace(fullTag, '').trim(),
    ytComments: {
      videoId: extractYouTubeVideoId(rawVideoId),
    },
  };
}

export function extractYouTubeReplySignal(text: string): {
  cleanText: string;
  ytReply: {
    parentId: string;
    text: string;
  } | null;
} {
  const match = text.match(
    /<<YOUTUBE_REPLY\s+parentId="(.*?)"\s+text="([\s\S]*?)"\s*>>/i
  );
  if (!match) return { cleanText: text, ytReply: null };

  const [fullTag, parentId, replyText] = match;
  return {
    cleanText: text.replace(fullTag, '').trim(),
    ytReply: {
      parentId: parentId.trim(),
      text: replyText.replace(/\\n/g, '\n'),
    },
  };
}

/**
 * YouTube Data API v3 Resumable Upload (videos.insert)
 */
export async function uploadYouTubeVideoResumable(
  accessToken: string,
  file: File,
  title: string,
  description: string,
  tags: string[]
): Promise<{ ok: boolean; videoId?: string; error?: string }> {
  if (!accessToken) {
    return {
      ok: false,
      error: 'YouTube সংযুক্ত নেই। Settings > Integrations থেকে Connect YouTube বাটনে ক্লিক করে সংযুক্ত করুন।',
    };
  }

  try {
    // Step 1: Initiate resumable upload session
    const initResponse = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': String(file.size),
          'X-Upload-Content-Type': file.type || 'video/*',
        },
        body: JSON.stringify({
          snippet: {
            title,
            description,
            tags,
          },
          status: {
            privacyStatus: 'public',
          },
        }),
      }
    );

    if (!initResponse.ok) {
      const errData = await initResponse.json().catch(() => ({}));
      return {
        ok: false,
        error:
          errData.error?.message ||
          `YouTube Upload Init Error (${initResponse.status})`,
      };
    }

    const uploadUrl = initResponse.headers.get('Location');
    if (!uploadUrl) {
      return {
        ok: false,
        error: 'YouTube API থেকে Resumable Upload Location পাওয়া যায়নি।',
      };
    }

    // Step 2: Upload the video file binary to the resumable session URI
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'video/*',
      },
      body: file,
    });

    const uploadData = await uploadResponse.json().catch(() => ({}));
    if (uploadResponse.ok && uploadData.id) {
      return {
        ok: true,
        videoId: uploadData.id,
      };
    }

    return {
      ok: false,
      error:
        uploadData.error?.message ||
        `YouTube Video Upload Error (${uploadResponse.status})`,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'নেটওয়ার্ক ত্রুটি',
    };
  }
}

/**
 * YouTube Data API v3 commentThreads.list
 */
export async function fetchYouTubeComments(
  accessToken: string,
  videoId: string
): Promise<{
  ok: boolean;
  comments: Array<{
    threadId: string;
    topLevelCommentId: string;
    author: string;
    text: string;
    publishedAt: string;
  }>;
  error?: string;
}> {
  if (!accessToken) {
    return {
      ok: false,
      comments: [],
      error: 'YouTube সংযুক্ত নেই। Settings > Integrations থেকে Connect YouTube বাটনে ক্লিক করে সংযুক্ত করুন।',
    };
  }

  try {
    const cleanId = extractYouTubeVideoId(videoId);
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${encodeURIComponent(
        cleanId
      )}&maxResults=10&order=time`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        comments: [],
        error: data.error?.message || `YouTube API Error (${response.status})`,
      };
    }

    const items = Array.isArray(data.items) ? data.items : [];
    const comments = items.map((item: any) => {
      const top = item.snippet?.topLevelComment;
      const snip = top?.snippet || {};
      return {
        threadId: item.id || '',
        topLevelCommentId: top?.id || item.id || '',
        author: snip.authorDisplayName || 'Unknown',
        text: snip.textOriginal || snip.textDisplay || '',
        publishedAt: snip.publishedAt || '',
      };
    });

    return { ok: true, comments };
  } catch (err: any) {
    return {
      ok: false,
      comments: [],
      error: err?.message || 'নেটওয়ার্ক ত্রুটি',
    };
  }
}

/**
 * YouTube Data API v3 comments.insert
 */
export async function postYouTubeCommentReply(
  accessToken: string,
  parentId: string,
  text: string
): Promise<{ ok: boolean; replyId?: string; error?: string }> {
  if (!accessToken) {
    return {
      ok: false,
      error: 'YouTube সংযুক্ত নেই। Settings > Integrations থেকে Connect YouTube বাটনে ক্লিক করে সংযুক্ত করুন।',
    };
  }

  try {
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/comments?part=snippet',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            parentId,
            textOriginal: text,
          },
        }),
      }
    );

    const data = await response.json().catch(() => ({}));
    if (response.ok && data.id) {
      return { ok: true, replyId: data.id };
    }
    return {
      ok: false,
      error: data.error?.message || `YouTube API Error (${response.status})`,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'নেটওয়ার্ক ত্রুটি',
    };
  }
}

const facebookMediaFiles = new Map<string, File>();

export function setFacebookMediaFile(msgId: string, file: File | null): void {
  if (file) {
    facebookMediaFiles.set(msgId, file);
  } else {
    facebookMediaFiles.delete(msgId);
  }
}

export function getFacebookMediaFile(msgId: string): File | undefined {
  return facebookMediaFiles.get(msgId);
}

export function extractFacebookPostSignal(text: string): {
  cleanText: string;
  fbPost: {
    mediaType: 'text' | 'photo' | 'video';
    message: string;
  } | null;
} {
  const match = text.match(
    /<<FACEBOOK_POST\s+type="(text|photo|video)"\s+message="([\s\S]*?)"\s*>>/i
  );
  if (!match) return { cleanText: text, fbPost: null };

  const [fullTag, rawType, rawMessage] = match;
  const mediaType = (rawType.toLowerCase() as 'text' | 'photo' | 'video') || 'text';

  return {
    cleanText: text.replace(fullTag, '').trim(),
    fbPost: {
      mediaType,
      message: rawMessage.replace(/\\n/g, '\n'),
    },
  };
}

export function extractFacebookCommentsSignal(text: string): {
  cleanText: string;
  fbComments: {
    postId: string;
  } | null;
} {
  const match = text.match(/<<FACEBOOK_COMMENTS\s+postId="(.*?)"\s*>>/i);
  if (!match) return { cleanText: text, fbComments: null };

  const [fullTag, rawPostId] = match;
  return {
    cleanText: text.replace(fullTag, '').trim(),
    fbComments: {
      postId: rawPostId.trim(),
    },
  };
}

export function extractFacebookReplySignal(text: string): {
  cleanText: string;
  fbReply: {
    commentId: string;
    text: string;
  } | null;
} {
  const match = text.match(
    /<<FACEBOOK_REPLY\s+commentId="(.*?)"\s+text="([\s\S]*?)"\s*>>/i
  );
  if (!match) return { cleanText: text, fbReply: null };

  const [fullTag, commentId, replyText] = match;
  return {
    cleanText: text.replace(fullTag, '').trim(),
    fbReply: {
      commentId: commentId.trim(),
      text: replyText.replace(/\\n/g, '\n'),
    },
  };
}

/**
 * Facebook Graph API: Post text (/{page-id}/feed), photo (/{page-id}/photos), or video (/{page-id}/videos)
 */
export async function publishFacebookPagePost(
  pageId: string,
  accessToken: string,
  mediaType: 'text' | 'photo' | 'video',
  message: string,
  file?: File
): Promise<{ ok: boolean; postId?: string; error?: string }> {
  if (!pageId || !accessToken) {
    return {
      ok: false,
      error: 'Facebook Page ID বা Access Token সংরক্ষিত নেই। Settings > Integrations থেকে সেভ করুন।',
    };
  }

  try {
    if (mediaType === 'photo') {
      if (!file) {
        return {
          ok: false,
          error: 'অনুগ্রহ করে আগে একটি ছবি (Photo) ফাইল সিলেক্ট করুন।',
        };
      }
      const formData = new FormData();
      formData.append('source', file);
      if (message) formData.append('caption', message);
      formData.append('access_token', accessToken);

      const response = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/photos`,
        {
          method: 'POST',
          body: formData,
        }
      );
      const data = await response.json().catch(() => ({}));
      if (response.ok && (data.post_id || data.id)) {
        return { ok: true, postId: data.post_id || data.id };
      }
      return {
        ok: false,
        error: data.error?.message || `Facebook API Error (${response.status})`,
      };
    }

    if (mediaType === 'video') {
      if (!file) {
        return {
          ok: false,
          error: 'অনুগ্রহ করে আগে একটি ভিডিও (Video) ফাইল সিলেক্ট করুন।',
        };
      }
      const formData = new FormData();
      formData.append('source', file);
      if (message) formData.append('description', message);
      formData.append('access_token', accessToken);

      const response = await fetch(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/videos`,
        {
          method: 'POST',
          body: formData,
        }
      );
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.id) {
        return { ok: true, postId: data.id };
      }
      return {
        ok: false,
        error: data.error?.message || `Facebook API Error (${response.status})`,
      };
    }

    // Default: text post to /{page-id}/feed
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/feed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          access_token: accessToken,
        }),
      }
    );
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.id) {
      return { ok: true, postId: data.id };
    }
    return {
      ok: false,
      error: data.error?.message || `Facebook API Error (${response.status})`,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'নেটওয়ার্ক ত্রুটি',
    };
  }
}

/**
 * Facebook Graph API: List comments on a Page post (/{post-id}/comments)
 */
export async function fetchFacebookPostComments(
  accessToken: string,
  postId: string
): Promise<{
  ok: boolean;
  comments: Array<{
    id: string;
    author: string;
    text: string;
    createdTime: string;
  }>;
  error?: string;
}> {
  if (!accessToken) {
    return {
      ok: false,
      comments: [],
      error: 'Facebook Page Access Token সংরক্ষিত নেই। Settings > Integrations থেকে সেভ করুন।',
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(
        postId.trim()
      )}/comments?fields=id,from,message,created_time&access_token=${encodeURIComponent(
        accessToken
      )}`
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      return {
        ok: false,
        comments: [],
        error: data.error?.message || `Facebook API Error (${response.status})`,
      };
    }

    const rawList = Array.isArray(data.data) ? data.data : [];
    const comments = rawList.map((item: any) => ({
      id: item.id || '',
      author: item.from?.name || 'Facebook User',
      text: item.message || '',
      createdTime: item.created_time || '',
    }));

    return { ok: true, comments };
  } catch (err: any) {
    return {
      ok: false,
      comments: [],
      error: err?.message || 'নেটওয়ার্ক ত্রুটি',
    };
  }
}

/**
 * Facebook Graph API: Reply to a comment (/{comment-id}/comments)
 */
export async function postFacebookCommentReply(
  accessToken: string,
  commentId: string,
  text: string
): Promise<{ ok: boolean; replyId?: string; error?: string }> {
  if (!accessToken) {
    return {
      ok: false,
      error: 'Facebook Page Access Token সংরক্ষিত নেই। Settings > Integrations থেকে সেভ করুন।',
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(commentId.trim())}/comments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          access_token: accessToken,
        }),
      }
    );
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.id) {
      return { ok: true, replyId: data.id };
    }
    return {
      ok: false,
      error: data.error?.message || `Facebook API Error (${response.status})`,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'নেটওয়ার্ক ত্রুটি',
    };
  }
}

export function extractPcActionSignal(text: string): {
  cleanText: string;
  pcAction: {
    actionType:
      | 'open_app_url'
      | 'type_text'
      | 'read_file'
      | 'send_whatsapp'
      | 'send_messenger'
      | 'play_media';
    target: string;
    text?: string;
  } | null;
} {
  const match = text.match(
    /<<PC_ACTION\s+type="(open_app_url|type_text|read_file|send_whatsapp|send_messenger|play_media)"\s+target="(.*?)"(?:\s+text="([\s\S]*?)")?\s*>>/i
  );
  if (!match) return { cleanText: text, pcAction: null };

  const [fullTag, rawType, rawTarget, rawText] = match;
  const actionType = rawType.toLowerCase() as
    | 'open_app_url'
    | 'type_text'
    | 'read_file'
    | 'send_whatsapp'
    | 'send_messenger'
    | 'play_media';
  return {
    cleanText: text.replace(fullTag, '').trim(),
    pcAction: {
      actionType,
      target: rawTarget.replace(/\\n/g, '\n').trim(),
      text: rawText !== undefined ? rawText.replace(/\\n/g, '\n') : undefined,
    },
  };
}

export async function executePcAction(
  actionType:
    | 'open_app_url'
    | 'type_text'
    | 'read_file'
    | 'send_whatsapp'
    | 'send_messenger'
    | 'play_media',
  target: string,
  text?: string
): Promise<{ ok: boolean; resultText?: string; error?: string }> {
  const desktopApi = typeof window !== 'undefined' ? (window as any).roseDesktop : undefined;

  if (!desktopApi || !desktopApi.isConnected?.()) {
    if (actionType === 'open_app_url' && /^https?:\/\//i.test(target)) {
      const win = window.open(target, '_blank', 'noopener,noreferrer');
      if (!win) {
        return { ok: false, error: 'ব্রাউজার নতুন ট্যাব ব্লক করেছে।' };
      }
      return { ok: true, resultText: `Opened: ${target}` };
    }
    return {
      ok: false,
      error: 'Desktop app not connected. এই কাজটি করতে Windows Desktop App (Electron) ব্যবহার করুন।',
    };
  }

  try {
    if (actionType === 'open_app_url') {
      await desktopApi.openAppOrUrl(target);
      return { ok: true, resultText: `Opened: ${target}` };
    }
    if (actionType === 'type_text') {
      await desktopApi.typeTextOrKeys(target);
      return { ok: true, resultText: `Typed: "${target}"` };
    }
    if (actionType === 'read_file') {
      const res = await desktopApi.readOrOpenFile(target);
      return {
        ok: true,
        resultText: res?.content ? `${res.name}:\n${res.content.slice(0, 1000)}` : `Read: ${target}`,
      };
    }
    if (actionType === 'send_whatsapp') {
      const res = await desktopApi.sendWhatsApp(target, text ?? '');
      return {
        ok: true,
        resultText: `WhatsApp-এ ${res?.phone || target} নম্বরে মেসেজটি পাঠানো হয়েছে।`,
      };
    }
    if (actionType === 'send_messenger') {
      const res = await desktopApi.sendMessenger(target, text ?? '');
      return {
        ok: true,
        resultText: `মেসেঞ্জারে ${res?.name || target}-কে মেসেজটি পাঠানো হয়েছে।`,
      };
    }
    if (actionType === 'play_media') {
      await desktopApi.playMedia(target);
      return {
        ok: true,
        resultText: `ইউটিউবে "${target}" চালু করা হয়েছে।`,
      };
    }
    return { ok: false, error: 'Unsupported PC action' };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || String(err),
    };
  }
}


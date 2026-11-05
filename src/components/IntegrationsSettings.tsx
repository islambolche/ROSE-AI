import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  MessageCircle,
  Youtube,
  Facebook,
  Music2,
  Mail,
  Play,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  Clipboard,
  Eye,
  EyeOff,
  ShieldCheck,
  Video,
  Upload,
  Sparkles,
} from 'lucide-react';
import {
  IntegrationsConfig,
  AppSettings,
  ConnectionStatus,
  ConnectionState,
} from '../types';
import { cleanApiKey } from '../services/connections';

interface IntegrationsSettingsProps {
  integrations: IntegrationsConfig;
  onSaveIntegrations: (newIntegrations: IntegrationsConfig) => void;
  onToast: (msg: string) => void;
  geminiKey?: string;
}

type IntegrationProvider = 'pcAccess' | 'whatsapp' | 'youtube' | 'facebookPage' | 'tiktok' | 'gmail';

export const IntegrationsSettings: React.FC<IntegrationsSettingsProps> = ({
  integrations,
  onSaveIntegrations,
  onToast,
  geminiKey,
}) => {
  const [localIntegrations, setLocalIntegrations] = useState<IntegrationsConfig>(integrations);
  const [connectionStates, setConnectionStates] = useState<Record<string, ConnectionState>>({
    pcAccess: { status: integrations.pcAccess ? 'ready' : 'not_set' },
    whatsapp: { status: integrations.whatsapp.accessToken ? 'ready' : 'not_set' },
    youtube: { status: integrations.youtube.accessToken ? 'ready' : 'not_set' },
    facebookPage: { status: integrations.facebookPage.accessToken ? 'ready' : 'not_set' },
    tiktok: { status: integrations.tiktok ? 'ready' : 'not_set' },
    gmail: { status: integrations.gmail.accessToken ? 'ready' : 'not_set' },
  });
  const [isVerifying, setIsVerifying] = useState<Record<string, boolean>>({});

  // Video Caption Tool State
  const [captionFile, setCaptionFile] = useState<File | null>(null);
  const [userProvidedCaptionText, setUserProvidedCaptionText] = useState<string>('');
  const [isProcessingCaption, setIsProcessingCaption] = useState(false);
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [captionResults, setRoseCaptionResults] = useState<{
    youtube: { shortCaption: string; longCaption: string; hashtags: string; tags: string };
    facebook: { caption: string; hashtags: string; tags: string };
    tiktok: { caption: string; hashtags: string; tags: string };
  } | null>(null);
  const [showFacebookToken, setShowFacebookToken] = useState(false);

  const handleTogglePcAccess = () => {
    const updated = { ...localIntegrations, pcAccess: !localIntegrations.pcAccess };
    setLocalIntegrations(updated);
    onSaveIntegrations(updated);
    setConnectionStates(prev => ({
      ...prev,
      pcAccess: { status: updated.pcAccess ? 'ready' : 'not_set' }
    }));
    onToast(updated.pcAccess ? 'PC Access permission granted' : 'PC Access permission revoked');
  };

  const handleSaveField = (provider: IntegrationProvider, value: any) => {
    const updated = { ...localIntegrations, [provider]: value };
    setLocalIntegrations(updated);
    onSaveIntegrations(updated);
    onToast(`${provider} settings saved`);
    
    // Status check logic (simulated for now as per instructions "Do not implement posting or sending yet")
    let hasValue = false;
    if (typeof value === 'string') hasValue = !!value;
    else if (value && typeof value === 'object') hasValue = !!value.accessToken;
    
    setConnectionStates(prev => ({
      ...prev,
      [provider]: { status: hasValue ? 'ready' : 'not_set', message: hasValue ? 'সফলভাবে সংযুক্ত' : '' }
    }));
  };

  const handleTest = async (provider: IntegrationProvider) => {
    setIsVerifying(prev => ({ ...prev, [provider]: true }));
    setConnectionStates(prev => ({
      ...prev,
      [provider]: { status: 'checking', message: 'যাচাই করা হচ্ছে...' }
    }));

    // Simulation: in a real implementation this would call an API
    setTimeout(() => {
      setIsVerifying(prev => ({ ...prev, [provider]: false }));
      const hasValue = !!(localIntegrations[provider] as any)?.accessToken || !!localIntegrations[provider];
      setConnectionStates(prev => ({
        ...prev,
        [provider]: { 
          status: hasValue ? 'ready' : 'error', 
          message: hasValue ? 'সফলভাবে সংযুক্ত' : 'কী নেই' 
        }
      }));
      onToast(hasValue ? `${provider} সংযোগ সফল!` : `${provider} সংযোগ ব্যর্থ`);
    }, 1000);
  };

  useEffect(() => {
    setLocalIntegrations(integrations);
  }, [integrations]);

  const handleConnectYouTube = () => {
    const cleanedClientId = cleanApiKey(localIntegrations.youtube.clientId || '');
    if (!cleanedClientId) {
      setConnectionStates(prev => ({
        ...prev,
        youtube: { status: 'error', message: 'প্রথমে OAuth Client ID দিন' }
      }));
      onToast('প্রথমে OAuth Client ID দিন');
      return;
    }

    if (!(window as any).google?.accounts?.oauth2) {
      setConnectionStates(prev => ({
        ...prev,
        youtube: { status: 'error', message: 'Google Identity Services লোড হয়নি' }
      }));
      onToast('Google API লোড হচ্ছে, একটু অপেক্ষা করুন');
      return;
    }

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: cleanedClientId,
        scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl',
        callback: (response: any) => {
          if (response.error) {
            const errMsg = response.error_description || response.error;
            setConnectionStates(prev => ({
              ...prev,
              youtube: { status: 'error', message: errMsg }
            }));
            onToast(`YouTube ত্রুটি: ${errMsg}`);
            return;
          }
          if (response.access_token) {
            const updated = { 
              ...localIntegrations, 
              youtube: { 
                ...localIntegrations.youtube,
                clientId: cleanedClientId,
                accessToken: response.access_token,
                expiryDate: Date.now() + ((response.expires_in || 3600) * 1000)
              } 
            };
            setLocalIntegrations(updated);
            onSaveIntegrations(updated);
            setConnectionStates(prev => ({
              ...prev,
              youtube: { status: 'ready', message: 'READY - সংযুক্ত' }
            }));
            onToast('YouTube সংযোগ সফল!');
          }
        },
        error_callback: (err: any) => {
          const errMsg = err?.message || err?.type || 'OAuth সংযোগ ব্যর্থ';
          setConnectionStates(prev => ({
            ...prev,
            youtube: { status: 'error', message: errMsg }
          }));
          onToast(`YouTube ত্রুটি: ${errMsg}`);
        }
      });
      client.requestAccessToken();
    } catch (err: any) {
      const errMsg = err?.message || 'YouTube Connect শুরু করতে সমস্যা হয়েছে';
      setConnectionStates(prev => ({
        ...prev,
        youtube: { status: 'error', message: errMsg }
      }));
      onToast(errMsg);
    }
  };

  const handleSaveYouTube = () => {
    const cleanedClientId = cleanApiKey(localIntegrations.youtube.clientId || '');
    const updatedYoutube = {
      ...localIntegrations.youtube,
      clientId: cleanedClientId,
    };
    const updated = { ...localIntegrations, youtube: updatedYoutube };
    setLocalIntegrations(updated);
    onSaveIntegrations(updated);
    onToast('YouTube OAuth Client ID সেভ করা হয়েছে');

    setConnectionStates(prev => ({
      ...prev,
      youtube: {
        status: updatedYoutube.accessToken ? 'ready' : 'not_set',
        message: updatedYoutube.accessToken ? prev.youtube?.message || 'সফলভাবে সংযুক্ত' : (cleanedClientId ? 'Client ID সেভ হয়েছে' : '')
      }
    }));
  };

  const handleTestYouTube = async () => {
    const { accessToken } = localIntegrations.youtube;
    if (!accessToken) {
      setConnectionStates(prev => ({
        ...prev,
        youtube: { status: 'error', message: 'প্রথমে Connect YouTube বাটনে ক্লিক করে সংযুক্ত করুন' }
      }));
      onToast('প্রথমে YouTube কানেক্ট করুন');
      return;
    }

    setIsVerifying(prev => ({ ...prev, youtube: true }));
    setConnectionStates(prev => ({
      ...prev,
      youtube: { status: 'checking', message: 'যাচাই করা হচ্ছে...' }
    }));

    try {
      const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const data = await response.json();
      
      if (response.ok && data.items && data.items.length > 0) {
        const channelName = data.items[0].snippet.title;
        setConnectionStates(prev => ({
          ...prev,
          youtube: { status: 'ready', message: `READY - ${channelName}` }
        }));
        onToast(`YouTube সংযোগ সফল: ${channelName}`);
      } else {
        const errMsg = data.error?.message || 'কোনো YouTube চ্যানেল পাওয়া যায়নি';
        setConnectionStates(prev => ({
          ...prev,
          youtube: { status: 'error', message: errMsg }
        }));
        onToast(`YouTube ত্রুটি: ${errMsg}`);
      }
    } catch (err: any) {
      setConnectionStates(prev => ({
        ...prev,
        youtube: { status: 'error', message: err.message || 'নেটওয়ার্ক ত্রুটি' }
      }));
      onToast('YouTube সংযোগ ব্যর্থ');
    } finally {
      setIsVerifying(prev => ({ ...prev, youtube: false }));
    }
  };

  const handleConnectGmail = () => {
    const cleanedClientId = cleanApiKey(
      localIntegrations.youtube.clientId || localIntegrations.gmail.clientId || ''
    );
    if (!cleanedClientId) {
      setConnectionStates(prev => ({
        ...prev,
        gmail: { status: 'error', message: 'প্রথমে YouTube কার্ডে OAuth Client ID সেভ করুন' }
      }));
      onToast('প্রথমে OAuth Client ID দিন');
      return;
    }

    if (!(window as any).google?.accounts?.oauth2) {
      setConnectionStates(prev => ({
        ...prev,
        gmail: { status: 'error', message: 'Google Identity Services লোড হয়নি' }
      }));
      onToast('Google API লোড হচ্ছে, একটু অপেক্ষা করুন');
      return;
    }

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: cleanedClientId,
        scope: 'https://www.googleapis.com/auth/gmail.send',
        callback: (response: any) => {
          if (response.error) {
            const errMsg = response.error_description || response.error;
            setConnectionStates(prev => ({
              ...prev,
              gmail: { status: 'error', message: errMsg }
            }));
            onToast(`Gmail ত্রুটি: ${errMsg}`);
            return;
          }
          if (response.access_token) {
            const updated = {
              ...localIntegrations,
              gmail: {
                ...localIntegrations.gmail,
                clientId: cleanedClientId,
                accessToken: response.access_token,
                expiryDate: Date.now() + ((response.expires_in || 3600) * 1000),
              },
            };
            setLocalIntegrations(updated);
            onSaveIntegrations(updated);
            setConnectionStates(prev => ({
              ...prev,
              gmail: { status: 'ready', message: 'READY - সংযুক্ত' }
            }));
            onToast('Gmail সংযোগ সফল!');
          }
        },
        error_callback: (err: any) => {
          const errMsg = err?.message || err?.type || 'OAuth সংযোগ ব্যর্থ';
          setConnectionStates(prev => ({
            ...prev,
            gmail: { status: 'error', message: errMsg }
          }));
          onToast(`Gmail ত্রুটি: ${errMsg}`);
        }
      });
      client.requestAccessToken();
    } catch (err: any) {
      const errMsg = err?.message || 'Gmail Connect শুরু করতে সমস্যা হয়েছে';
      setConnectionStates(prev => ({
        ...prev,
        gmail: { status: 'error', message: errMsg }
      }));
      onToast(errMsg);
    }
  };

  const handleTestGmail = async () => {
    const { accessToken } = localIntegrations.gmail;
    if (!accessToken) {
      setConnectionStates(prev => ({
        ...prev,
        gmail: { status: 'error', message: 'প্রথমে Connect Gmail বাটনে ক্লিক করে সংযুক্ত করুন' }
      }));
      onToast('প্রথমে Gmail কানেক্ট করুন');
      return;
    }

    setIsVerifying(prev => ({ ...prev, gmail: true }));
    setConnectionStates(prev => ({
      ...prev,
      gmail: { status: 'checking', message: 'যাচাই করা হচ্ছে...' }
    }));

    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const data = await response.json();

      if (response.ok && data.emailAddress) {
        setConnectionStates(prev => ({
          ...prev,
          gmail: { status: 'ready', message: `READY - ${data.emailAddress}` }
        }));
        onToast(`Gmail সংযোগ সফল: ${data.emailAddress}`);
      } else {
        const errMsg = data.error?.message || 'Gmail প্রোফাইল পাওয়া যায়নি';
        setConnectionStates(prev => ({
          ...prev,
          gmail: { status: 'error', message: errMsg }
        }));
        onToast(`Gmail ত্রুটি: ${errMsg}`);
      }
    } catch (err: any) {
      setConnectionStates(prev => ({
        ...prev,
        gmail: { status: 'error', message: err.message || 'নেটওয়ার্ক ত্রুটি' }
      }));
      onToast('Gmail সংযোগ ব্যর্থ');
    } finally {
      setIsVerifying(prev => ({ ...prev, gmail: false }));
    }
  };

  const handleTestFacebook = async () => {
    const { accessToken, pageId } = localIntegrations.facebookPage;
    if (!accessToken || !pageId) {
      setConnectionStates(prev => ({
        ...prev,
        facebookPage: { status: 'error', message: 'Page ID ও Token উভয়ই প্রয়োজন' }
      }));
      onToast('Page ID ও Token উভয়ই প্রয়োজন');
      return;
    }

    setIsVerifying(prev => ({ ...prev, facebookPage: true }));
    setConnectionStates(prev => ({
      ...prev,
      facebookPage: { status: 'checking', message: 'যাচাই করা হচ্ছে...' }
    }));

    try {
      // Use proxy or direct fetch. FB Graph API usually allows CORS for some apps, 
      // but if it fails, the user will see an error.
      const response = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=name&access_token=${accessToken}`);
      const data = await response.json();

      if (data.name) {
        setConnectionStates(prev => ({
          ...prev,
          facebookPage: { status: 'ready', message: `READY - ${data.name}` }
        }));
        onToast(`Facebook সংযোগ সফল: ${data.name}`);
      } else {
        const errMsg = data.error?.message || 'অজানা ত্রুটি';
        setConnectionStates(prev => ({
          ...prev,
          facebookPage: { status: 'error', message: errMsg }
        }));
        onToast(`Facebook ত্রুটি: ${errMsg}`);
      }
    } catch (err: any) {
      setConnectionStates(prev => ({
        ...prev,
        facebookPage: { status: 'error', message: err.message || 'নেটওয়ার্ক ত্রুটি' }
      }));
      onToast('Facebook সংযোগ ব্যর্থ');
    } finally {
      setIsVerifying(prev => ({ ...prev, facebookPage: false }));
    }
  };

  const handlePasteFacebook = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setLocalIntegrations(prev => ({
            ...prev,
            facebookPage: { ...prev.facebookPage, accessToken: text.trim() }
          }));
          onToast('টোকেন পেস্ট করা হয়েছে');
          return;
        }
      }
    } catch {
      onToast('ক্লিপবোর্ড পড়ার অনুমতি নেই');
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCaptionFile(file);
      setCaptionError(null);
    }
  };

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast(`${label} কপি করা হয়েছে`);
    } catch {
      onToast('কপি করা যায়নি');
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const commaIdx = result.indexOf(',');
        resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
      };
      reader.onerror = () => reject(new Error('ভিডিও ফাইল পড়া যায়নি'));
      reader.readAsDataURL(file);
    });

  const uploadVideoViaGeminiFileApi = async (
    file: File,
    apiKey: string
  ): Promise<{ fileUri: string; mimeType: string }> => {
    const mimeType = file.type || 'video/mp4';
    const startRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(file.size),
          'X-Goog-Upload-Header-Content-Type': mimeType,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: { display_name: file.name },
        }),
      }
    );

    if (!startRes.ok) {
      const errData = await startRes.json().catch(() => ({}));
      throw new Error(
        errData.error?.message || `Gemini File Upload Init Error (${startRes.status})`
      );
    }

    const uploadUrl = startRes.headers.get('x-goog-upload-url');
    if (!uploadUrl) {
      throw new Error('Gemini File API থেকে upload URL পাওয়া যায়নি');
    }

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': String(file.size),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: file,
    });

    const uploadData = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok || !uploadData.file?.uri) {
      throw new Error(
        uploadData.error?.message || `Gemini File Upload Error (${uploadRes.status})`
      );
    }

    const fileUri: string = uploadData.file.uri;
    const fileName: string = uploadData.file.name;

    // Wait until video processing state is ACTIVE
    for (let i = 0; i < 15; i++) {
      const state = uploadData.file?.state;
      if (state === 'ACTIVE' && i === 0) break;
      await new Promise((r) => setTimeout(r, 2000));
      const checkRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${encodeURIComponent(apiKey)}`
      );
      const checkData = await checkRes.json().catch(() => ({}));
      if (checkData.state === 'ACTIVE') break;
      if (checkData.state === 'FAILED') {
        throw new Error('Gemini সার্ভারে ভিডিও প্রসেসিং ব্যর্থ হয়েছে');
      }
    }

    return { fileUri, mimeType };
  };

  const generateCaptions = async () => {
    const activeGeminiKey = cleanApiKey(geminiKey || '');
    if (!captionFile || !activeGeminiKey) {
      onToast(activeGeminiKey ? 'ভিডিও ফাইল নির্বাচন করুন' : 'Settings > Connections-এ Gemini কী সেভ করুন');
      return;
    }

    setIsProcessingCaption(true);
    setCaptionError(null);

    try {
      const mimeType = captionFile.type || 'video/mp4';
      let videoPart: any;

      // Use inline_data for videos <= 18MB, otherwise Gemini File API resumable upload
      if (captionFile.size <= 18 * 1024 * 1024) {
        const base64Data = await fileToBase64(captionFile);
        videoPart = {
          inline_data: {
            mime_type: mimeType,
            data: base64Data,
          },
        };
      } else {
        const uploaded = await uploadVideoViaGeminiFileApi(captionFile, activeGeminiKey);
        videoPart = {
          file_data: {
            mime_type: uploaded.mimeType,
            file_uri: uploaded.fileUri,
          },
        };
      }

      const exactUserText = userProvidedCaptionText;
      const hasUserText = exactUserText.trim().length > 0;

      const promptText = `Analyze this uploaded video carefully and return separate Bengali social media packages for YouTube, Facebook, and TikTok.
Rules:
1. Language: Strictly Bengali (বাংলা).
2. For YouTube: provide a short caption (shortCaption), a long caption (longCaption), hashtags, and comma-separated tags.
3. For Facebook: provide a caption, hashtags, and comma-separated tags.
4. For TikTok: provide a caption, hashtags, and comma-separated tags (note: TikTok is caption, hashtags, and tags only, no upload).
5. CRITICAL RULE: ${
        hasUserText
          ? `The user provided this exact text: ${JSON.stringify(
              exactUserText
            )}. Any text the user provided MUST be used EXACTLY as written, with nothing added or changed.`
          : 'Write natural, engaging Bengali captions, hashtags, and tags based strictly on what is in the video.'
      }

Respond ONLY with valid JSON in this exact structure:
{
  "youtube": {
    "shortCaption": "...",
    "longCaption": "...",
    "hashtags": "#...",
    "tags": "tag1, tag2, tag3"
  },
  "facebook": {
    "caption": "...",
    "hashtags": "#...",
    "tags": "tag1, tag2, tag3"
  },
  "tiktok": {
    "caption": "...",
    "hashtags": "#...",
    "tags": "tag1, tag2, tag3"
  }
}`;

      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-pro'];
      let responseData: any = null;
      let lastErrorMsg = '';

      for (const modelName of modelsToTry) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
            activeGeminiKey
          )}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [videoPart, { text: promptText }],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
              },
            }),
          }
        );

        const json = await res.json().catch(() => ({}));
        if (res.ok && json.candidates?.[0]?.content?.parts?.[0]?.text) {
          responseData = json;
          break;
        }
        lastErrorMsg = json.error?.message || `Gemini API Error (${res.status})`;
      }

      if (!responseData) {
        throw new Error(lastErrorMsg || 'Gemini থেকে উত্তর পাওয়া যায়নি');
      }

      const rawText = String(responseData.candidates[0].content.parts[0].text || '')
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      const parsed = JSON.parse(rawText);

      const finalResults = {
        youtube: {
          shortCaption: hasUserText ? exactUserText : String(parsed?.youtube?.shortCaption || ''),
          longCaption: hasUserText ? exactUserText : String(parsed?.youtube?.longCaption || ''),
          hashtags: String(parsed?.youtube?.hashtags || ''),
          tags: String(parsed?.youtube?.tags || ''),
        },
        facebook: {
          caption: hasUserText ? exactUserText : String(parsed?.facebook?.caption || ''),
          hashtags: String(parsed?.facebook?.hashtags || ''),
          tags: String(parsed?.facebook?.tags || ''),
        },
        tiktok: {
          caption: hasUserText ? exactUserText : String(parsed?.tiktok?.caption || ''),
          hashtags: String(parsed?.tiktok?.hashtags || ''),
          tags: String(parsed?.tiktok?.tags || ''),
        },
      };

      setRoseCaptionResults(finalResults);
      try {
        localStorage.setItem(
          'rose_last_video_caption_yt',
          JSON.stringify({
            caption: finalResults.youtube.longCaption || finalResults.youtube.shortCaption,
            shortCaption: finalResults.youtube.shortCaption,
            longCaption: finalResults.youtube.longCaption,
            hashtags: finalResults.youtube.hashtags,
            tags: finalResults.youtube.tags,
          })
        );
      } catch {
        // ignore
      }
      onToast('ক্যাপশন তৈরি সফল হয়েছে');
    } catch (err: any) {
      const msg = err?.message || 'ক্যাপশন তৈরিতে সমস্যা হয়েছে';
      setCaptionError(msg);
      onToast(msg);
    } finally {
      setIsProcessingCaption(false);
    }
  };

  const renderStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case 'ready':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.35)] flex items-center gap-1">
            <Check className="w-3 h-3 stroke-[3]" />
            <span>READY</span>
          </span>
        );
      case 'checking':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)] flex items-center gap-1 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>CHECKING</span>
          </span>
        );
      case 'error':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.35)] flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>ERROR</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
            NOT SET
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#091a3f] via-[#071333] to-[#091a3f] border border-sky-500/40 flex items-center justify-between shadow-[0_0_20px_rgba(56,189,248,0.2)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white tracking-wide uppercase">Integrations & Access</h4>
            <p className="text-[10px] text-sky-200/80">থার্ড-পার্টি সার্ভিস ও এক্সেস কন্ট্রোল</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400">Ask before action</span>
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    checked={localIntegrations.askBeforeAction}
                    onChange={(e) => {
                        const updated = { ...localIntegrations, askBeforeAction: e.target.checked };
                        setLocalIntegrations(updated);
                        onSaveIntegrations(updated);
                        onToast(updated.askBeforeAction ? 'Confirmation enabled' : 'Confirmation disabled');
                    }}
                    className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
            </label>
        </div>
      </div>

      <div className="space-y-3.5">
        {/* PC Access Card */}
        <div className="p-4 rounded-2xl bg-[#081533] border border-sky-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-500/20 text-slate-300 flex items-center justify-center border border-white/10">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white tracking-wider">PC Access</h4>
                <p className="text-[10px] text-sky-200/80">(Local OS integration)</p>
              </div>
            </div>
            {renderStatusBadge(connectionStates.pcAccess.status)}
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#050c20] border border-sky-900/80">
            <span className="text-xs font-bold text-slate-300">Grant permission for OS commands</span>
            <button
                onClick={handleTogglePcAccess}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all ${
                    localIntegrations.pcAccess 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
            >
                {localIntegrations.pcAccess ? 'ALLOWED' : 'REQUEST'}
            </button>
          </div>
        </div>

        {/* WhatsApp Business Card */}
        <div className="p-4 rounded-2xl bg-[#081533] border border-sky-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-white/10">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white tracking-wider">WhatsApp Business</h4>
                <p className="text-[10px] text-sky-200/80">(Cloud API)</p>
              </div>
            </div>
            {renderStatusBadge(connectionStates.whatsapp.status)}
          </div>
          <div className="space-y-2">
            <input
              type="password"
              value={localIntegrations.whatsapp.accessToken}
              onChange={(e) => setLocalIntegrations(prev => ({ ...prev, whatsapp: { ...prev.whatsapp, accessToken: e.target.value } }))}
              placeholder="Access Token"
              className="w-full bg-[#050c20] border border-sky-900/80 rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-sky-400"
            />
            <input
              type="text"
              value={localIntegrations.whatsapp.phoneNumberId}
              onChange={(e) => setLocalIntegrations(prev => ({ ...prev, whatsapp: { ...prev.whatsapp, phoneNumberId: e.target.value } }))}
              placeholder="Phone Number ID"
              className="w-full bg-[#050c20] border border-sky-900/80 rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-sky-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-sky-950">
            <button onClick={() => handleTest('whatsapp')} className="px-3 py-1.5 rounded-xl bg-[#071738] border border-sky-500/40 text-sky-200 text-xs font-extrabold flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 fill-current text-sky-400" />
                <span>Test</span>
            </button>
            <button onClick={() => handleSaveField('whatsapp', localIntegrations.whatsapp)} className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-xs font-extrabold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Save</span>
            </button>
          </div>
        </div>

        {/* YouTube Card */}
        <div className="p-4 rounded-2xl bg-[#081533] border border-sky-500/40 space-y-3 shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center border border-white/10 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                <Youtube className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white tracking-wider font-display">YouTube</h4>
                <p className="text-[10px] text-sky-200/80">(Google OAuth)</p>
              </div>
            </div>
            {renderStatusBadge(connectionStates.youtube.status)}
          </div>

          <div className="space-y-2.5">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">OAuth Client ID</label>
              <input
                type="text"
                value={localIntegrations.youtube.clientId}
                onChange={(e) => setLocalIntegrations(prev => ({ ...prev, youtube: { ...prev.youtube, clientId: e.target.value } }))}
                placeholder="e.g. 123456...apps.googleusercontent.com"
                className="w-full bg-[#050c20] border border-sky-900/80 focus:border-sky-400 focus:shadow-[0_0_10px_rgba(56,189,248,0.15)] rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] px-1">
            {connectionStates.youtube.message && (
              <span className={`font-semibold truncate ${
                connectionStates.youtube.status === 'ready' ? 'text-emerald-400' : 
                connectionStates.youtube.status === 'error' ? 'text-rose-400' : 'text-slate-400'
              }`}>
                {connectionStates.youtube.message}
              </span>
            )}
            {localIntegrations.youtube.accessToken && (
              <span className="font-mono text-[9px] text-slate-500 ml-auto">
                Token Active
              </span>
            )}
          </div>

          <div className="flex justify-between items-center gap-2 pt-2 border-t border-sky-950/60">
             <button 
               onClick={handleConnectYouTube}
               disabled={isVerifying.youtube}
               className="flex-1 py-1.5 rounded-xl bg-[#071738] border border-sky-500/40 text-sky-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#0b2150] transition-all disabled:opacity-50"
             >
                 <ExternalLink className="w-3.5 h-3.5" />
                 Connect YouTube
             </button>
             <div className="flex items-center gap-2">
               <button 
                 onClick={handleTestYouTube} 
                 disabled={isVerifying.youtube}
                 className="px-3 py-1.5 rounded-xl bg-[#071738] hover:bg-[#0b2150] border border-sky-500/40 text-sky-200 hover:text-white text-xs font-extrabold flex items-center gap-1.5 transition-all disabled:opacity-50"
               >
                 {isVerifying.youtube ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current text-sky-400" />}
                 <span>Test</span>
               </button>
               <button 
                 onClick={handleSaveYouTube} 
                 disabled={isVerifying.youtube}
                 className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-[0_0_12px_rgba(56,189,248,0.3)] transition-all disabled:opacity-50"
               >
                 <Check className="w-3.5 h-3.5 stroke-[3]" />
                 <span>Save</span>
               </button>
             </div>
          </div>
        </div>

        {/* Facebook Page Card */}
        <div className="p-4 rounded-2xl bg-[#081533] border border-sky-500/40 space-y-3 shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center border border-white/10 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                <Facebook className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white tracking-wider font-display">Facebook Page</h4>
                <p className="text-[10px] text-sky-200/80">(Page API Access)</p>
              </div>
            </div>
            {renderStatusBadge(connectionStates.facebookPage.status)}
          </div>
          
          <div className="space-y-2.5">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Page ID</label>
              <input
                type="text"
                value={localIntegrations.facebookPage.pageId}
                onChange={(e) => setLocalIntegrations(prev => ({ ...prev, facebookPage: { ...prev.facebookPage, pageId: e.target.value } }))}
                placeholder="e.g. 123456789012345"
                className="w-full bg-[#050c20] border border-sky-900/80 focus:border-sky-400 focus:shadow-[0_0_10px_rgba(56,189,248,0.15)] rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none transition-all"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Page Access Token</label>
              <div className="relative">
                <div className="flex items-center bg-[#050c20] border border-sky-900/80 focus-within:border-sky-400 focus-within:shadow-[0_0_15px_rgba(56,189,248,0.2)] rounded-xl px-3 py-1.5 transition-all">
                  <input
                    type={showFacebookToken ? 'text' : 'password'}
                    value={localIntegrations.facebookPage.accessToken}
                    onChange={(e) => setLocalIntegrations(prev => ({ ...prev, facebookPage: { ...prev.facebookPage, accessToken: e.target.value } }))}
                    placeholder="EAA..."
                    className="flex-1 bg-transparent font-mono text-xs text-white placeholder-slate-600 focus:outline-none min-w-0 py-1"
                  />
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={handlePasteFacebook}
                      className="px-2 py-1 rounded-lg bg-sky-950/90 hover:bg-sky-900 border border-sky-500/30 text-[10px] font-bold text-sky-300 hover:text-white flex items-center gap-1 transition-all"
                    >
                      <Clipboard className="w-3 h-3" />
                      <span>Paste</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFacebookToken(!showFacebookToken)}
                      className="p-1 rounded-lg text-slate-400 hover:text-sky-300 transition-colors"
                    >
                      {showFacebookToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] px-1">
            {connectionStates.facebookPage.message && (
              <span className={`font-semibold truncate ${
                connectionStates.facebookPage.status === 'ready' ? 'text-emerald-400' : 
                connectionStates.facebookPage.status === 'error' ? 'text-rose-400' : 'text-slate-400'
              }`}>
                {connectionStates.facebookPage.message}
              </span>
            )}
            <span className="font-mono text-slate-400 ml-auto">
              Token length: <span className="text-sky-300 font-bold">{localIntegrations.facebookPage.accessToken.length}</span>
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-sky-950/60">
            <button 
              onClick={handleTestFacebook} 
              disabled={isVerifying.facebookPage}
              className="px-3 py-1.5 rounded-xl bg-[#071738] hover:bg-[#0b2150] border border-sky-500/40 text-sky-200 hover:text-white text-xs font-extrabold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isVerifying.facebookPage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current text-sky-400" />}
              <span>Test</span>
            </button>
            <button 
              onClick={() => handleSaveField('facebookPage', localIntegrations.facebookPage)} 
              disabled={isVerifying.facebookPage}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-[0_0_12px_rgba(56,189,248,0.3)] transition-all disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* TikTok Card */}
        <div className="p-4 rounded-2xl bg-[#081533] border border-sky-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-300 flex items-center justify-center border border-white/10">
                <Music2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white tracking-wider">TikTok</h4>
                <p className="text-[10px] text-sky-200/80">(Access Token)</p>
              </div>
            </div>
            {renderStatusBadge(connectionStates.tiktok.status)}
          </div>
          <input
            type="password"
            value={localIntegrations.tiktok}
            onChange={(e) => setLocalIntegrations(prev => ({ ...prev, tiktok: e.target.value }))}
            placeholder="Access Token"
            className="w-full bg-[#050c20] border border-sky-900/80 rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-sky-400"
          />
          <div className="flex justify-end gap-2 pt-1 border-t border-sky-950">
            <button onClick={() => handleTest('tiktok')} className="px-3 py-1.5 rounded-xl bg-[#071738] border border-sky-500/40 text-sky-200 text-xs font-extrabold flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 fill-current text-sky-400" />
                <span>Test</span>
            </button>
            <button onClick={() => handleSaveField('tiktok', localIntegrations.tiktok)} className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-xs font-extrabold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Save</span>
            </button>
          </div>
        </div>

        {/* Gmail Card */}
        <div className="p-4 rounded-2xl bg-[#081533] border border-sky-500/40 space-y-3 shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-white/10 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white tracking-wider font-display">Gmail</h4>
                <p className="text-[10px] text-sky-200/80">(Google OAuth • Job Applications)</p>
              </div>
            </div>
            {renderStatusBadge(connectionStates.gmail.status)}
          </div>

          <div className="space-y-2.5">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                OAuth Client ID (Shared with YouTube)
              </label>
              <input
                type="text"
                value={localIntegrations.youtube.clientId || localIntegrations.gmail.clientId}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalIntegrations((prev) => ({
                    ...prev,
                    youtube: { ...prev.youtube, clientId: val },
                    gmail: { ...prev.gmail, clientId: val },
                  }));
                }}
                placeholder="e.g. 123456...apps.googleusercontent.com"
                className="w-full bg-[#050c20] border border-sky-900/80 focus:border-sky-400 focus:shadow-[0_0_10px_rgba(56,189,248,0.15)] rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] px-1">
            {connectionStates.gmail.message && (
              <span
                className={`font-semibold truncate ${
                  connectionStates.gmail.status === 'ready'
                    ? 'text-emerald-400'
                    : connectionStates.gmail.status === 'error'
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {connectionStates.gmail.message}
              </span>
            )}
            {localIntegrations.gmail.accessToken && (
              <span className="font-mono text-[9px] text-slate-500 ml-auto">
                Token Active
              </span>
            )}
          </div>

          <div className="flex justify-between items-center gap-2 pt-2 border-t border-sky-950/60">
            <button
              onClick={handleConnectGmail}
              disabled={isVerifying.gmail}
              className="flex-1 py-1.5 rounded-xl bg-[#071738] border border-sky-500/40 text-sky-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#0b2150] transition-all disabled:opacity-50"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Connect Gmail
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTestGmail}
                disabled={isVerifying.gmail}
                className="px-3 py-1.5 rounded-xl bg-[#071738] hover:bg-[#0b2150] border border-sky-500/40 text-sky-200 hover:text-white text-xs font-extrabold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isVerifying.gmail ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current text-sky-400" />
                )}
                <span>Test</span>
              </button>
              <button
                onClick={handleSaveYouTube}
                disabled={isVerifying.gmail}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-[0_0_12px_rgba(56,189,248,0.3)] transition-all disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>

        {/* Video Caption Tool Section */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0a1b42] to-[#07112d] border border-indigo-500/30 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white tracking-wide uppercase">Video Caption Tool</h4>
              <p className="text-[11px] text-indigo-200/70">
                Gemini ভিডিও ইনপুট ব্যবহার করে YouTube, Facebook ও TikTok-এর বাংলা ক্যাপশন, হ্যাশট্যাগ ও ট্যাগ
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative group">
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
                id="video-upload-input"
              />
              <label
                htmlFor="video-upload-input"
                className="flex flex-col items-center justify-center w-full h-28 rounded-2xl border-2 border-dashed border-sky-800 bg-[#050c20]/60 hover:bg-[#07153d]/80 hover:border-sky-400 transition-all cursor-pointer group"
              >
                {captionFile ? (
                  <div className="flex flex-col items-center text-center">
                    <Check className="w-7 h-7 text-emerald-400 mb-1.5" />
                    <span className="text-xs font-bold text-white truncate max-w-[240px]">
                      {captionFile.name}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {(captionFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <Upload className="w-7 h-7 text-sky-400 mb-1.5 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-300">ভিডিও ফাইল আপলোড করুন</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      MP4, MOV, WEBM, AVI (Gemini Inline / File API)
                    </span>
                  </div>
                )}
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 block">
                আপনার লেখা (ঐচ্ছিক — যা লিখবেন হুবহু তাই থাকবে, কিছু যোগ বা পরিবর্তন হবে না)
              </label>
              <textarea
                rows={2}
                value={userProvidedCaptionText}
                onChange={(e) => setUserProvidedCaptionText(e.target.value)}
                placeholder="আপনি কোনো নির্দিষ্ট টেক্সট বা ক্যাপশন দিতে চাইলে এখানে লিখুন..."
                className="w-full bg-[#050c20] border border-sky-900/80 focus:border-sky-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
              />
            </div>

            {captionError && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-[11px] text-rose-300 font-semibold">
                ত্রুটি: {captionError}
              </div>
            )}

            <button
              type="button"
              onClick={generateCaptions}
              disabled={!captionFile || isProcessingCaption}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isProcessingCaption ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
              )}
              <span>CREATE CAPTIONS IN BENGALI</span>
            </button>
          </div>

          {captionResults && (
            <div className="space-y-3 animate-in slide-in-from-top-4 duration-300">
              {/* YouTube Result Card */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-rose-400" />
                    <span className="text-[11px] font-black uppercase text-white tracking-widest">
                      YouTube
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        `Short Caption:\n${captionResults.youtube.shortCaption}\n\nLong Caption:\n${captionResults.youtube.longCaption}\n\nHashtags:\n${captionResults.youtube.hashtags}\n\nTags:\n${captionResults.youtube.tags}`,
                        'YouTube সব তথ্য'
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-[10px] font-bold text-sky-300 flex items-center gap-1 transition-all"
                  >
                    <Clipboard className="w-3 h-3" />
                    <span>Copy All</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">
                        Short Caption (ছোট ক্যাপশন)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(captionResults.youtube.shortCaption, 'YouTube Short Caption')
                        }
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-sky-300 flex items-center gap-1"
                      >
                        <Clipboard className="w-2.5 h-2.5" />
                        <span>Copy</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5">
                      {captionResults.youtube.shortCaption}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">
                        Long Caption (বড় ক্যাপশন)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(captionResults.youtube.longCaption, 'YouTube Long Caption')
                        }
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-sky-300 flex items-center gap-1"
                      >
                        <Clipboard className="w-2.5 h-2.5" />
                        <span>Copy</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5">
                      {captionResults.youtube.longCaption}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Hashtags</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(captionResults.youtube.hashtags, 'YouTube Hashtags')
                          }
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-sky-300 flex items-center gap-1"
                        >
                          <Clipboard className="w-2.5 h-2.5" />
                          <span>Copy</span>
                        </button>
                      </div>
                      <div className="text-[10px] text-sky-400 font-mono bg-black/30 p-2 rounded-xl border border-white/5 break-words">
                        {captionResults.youtube.hashtags}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Tags</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(captionResults.youtube.tags, 'YouTube Tags')}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-sky-300 flex items-center gap-1"
                        >
                          <Clipboard className="w-2.5 h-2.5" />
                          <span>Copy</span>
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono bg-black/30 p-2 rounded-xl border border-white/5 break-words">
                        {captionResults.youtube.tags}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Facebook Result Card */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-blue-400" />
                    <span className="text-[11px] font-black uppercase text-white tracking-widest">
                      Facebook
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        `Caption:\n${captionResults.facebook.caption}\n\nHashtags:\n${captionResults.facebook.hashtags}\n\nTags:\n${captionResults.facebook.tags}`,
                        'Facebook সব তথ্য'
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-[10px] font-bold text-sky-300 flex items-center gap-1 transition-all"
                  >
                    <Clipboard className="w-3 h-3" />
                    <span>Copy All</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Caption</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(captionResults.facebook.caption, 'Facebook Caption')
                        }
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-sky-300 flex items-center gap-1"
                      >
                        <Clipboard className="w-2.5 h-2.5" />
                        <span>Copy</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5">
                      {captionResults.facebook.caption}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Hashtags</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(captionResults.facebook.hashtags, 'Facebook Hashtags')
                          }
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-sky-300 flex items-center gap-1"
                        >
                          <Clipboard className="w-2.5 h-2.5" />
                          <span>Copy</span>
                        </button>
                      </div>
                      <div className="text-[10px] text-sky-400 font-mono bg-black/30 p-2 rounded-xl border border-white/5 break-words">
                        {captionResults.facebook.hashtags}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Tags</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(captionResults.facebook.tags, 'Facebook Tags')}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-sky-300 flex items-center gap-1"
                        >
                          <Clipboard className="w-2.5 h-2.5" />
                          <span>Copy</span>
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono bg-black/30 p-2 rounded-xl border border-white/5 break-words">
                        {captionResults.facebook.tags}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* TikTok Result Card (No upload — only caption, hashtags & tags) */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music2 className="w-4 h-4 text-pink-400" />
                    <span className="text-[11px] font-black uppercase text-white tracking-widest">
                      TikTok (Only Caption, Hashtags & Tags — No Upload)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        `Caption:\n${captionResults.tiktok.caption}\n\nHashtags:\n${captionResults.tiktok.hashtags}\n\nTags:\n${captionResults.tiktok.tags}`,
                        'TikTok সব তথ্য'
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-[10px] font-bold text-sky-300 flex items-center gap-1 transition-all"
                  >
                    <Clipboard className="w-3 h-3" />
                    <span>Copy All</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Caption</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(captionResults.tiktok.caption, 'TikTok Caption')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-sky-300 flex items-center gap-1"
                      >
                        <Clipboard className="w-2.5 h-2.5" />
                        <span>Copy</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5">
                      {captionResults.tiktok.caption}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Hashtags</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(captionResults.tiktok.hashtags, 'TikTok Hashtags')
                          }
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-sky-300 flex items-center gap-1"
                        >
                          <Clipboard className="w-2.5 h-2.5" />
                          <span>Copy</span>
                        </button>
                      </div>
                      <div className="text-[10px] text-sky-400 font-mono bg-black/30 p-2 rounded-xl border border-white/5 break-words">
                        {captionResults.tiktok.hashtags}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Tags</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(captionResults.tiktok.tags, 'TikTok Tags')}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-sky-300 flex items-center gap-1"
                        >
                          <Clipboard className="w-2.5 h-2.5" />
                          <span>Copy</span>
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono bg-black/30 p-2 rounded-xl border border-white/5 break-words">
                        {captionResults.tiktok.tags}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

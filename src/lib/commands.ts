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

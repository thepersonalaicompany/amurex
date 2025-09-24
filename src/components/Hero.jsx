import {
  LiveSuggestionsComponent,
  SummaryComponent,
  TranscriptView,
} from '@/components';
import { useUIStore } from '@/store';

export const Hero = () => {
  const { currentTab } = useUIStore();
  if (currentTab === 'Summary') {
    return <SummaryComponent />;
  } else if (currentTab === 'Suggestions') {
    return <LiveSuggestionsComponent />;
  } else if (currentTab === 'Transcript') {
    return <TranscriptView />;
  } else {
    return;
  }
};

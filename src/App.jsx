import { Footer, Hero, HeroContainer, Navbar } from '@/components';
import AuthGuard from '@/components/AuthGuard';
import ErrorBoundary from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <div className='relative h-screen w-full'>
          <Navbar />
          <div className='h-full pt-[54px] pb-[70px]'>
            <HeroContainer>
              <Hero />
            </HeroContainer>
          </div>
          <Footer />
        </div>
      </AuthGuard>
    </ErrorBoundary>
  );
}

export default App;

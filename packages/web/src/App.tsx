import { useEffect, useRef } from 'react';
import NavBar from './components/NavBar';
import HeroSection from './components/HeroSection';
import TopologySection from './components/TopologySection';
import HowItWorksSection from './components/HowItWorksSection';
import InstallSection from './components/InstallSection';
import ScopeSection from './components/ScopeSection';
import Footer from './components/Footer';

export default function App() {
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.remove('hidden-below');
                    }
                });
            },
            { threshold: 0.1 }
        );

        document.querySelectorAll('.section-reveal').forEach((el) => {
            el.classList.add('hidden-below');
            observerRef.current?.observe(el);
        });

        return () => observerRef.current?.disconnect();
    }, []);

    return (
        <div className="bg-background text-on-surface selection:bg-primary-container selection:text-on-primary-container min-h-screen">
            <NavBar />
            <main>
                <HeroSection />
                <TopologySection />
                <HowItWorksSection />
                <InstallSection />
                <ScopeSection />
            </main>
            <Footer />
        </div>
    );
}

import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useAuth } from '../App';

export default function Layout() {
 const { isDemoMode, toggleDemoMode } = useAuth();

 return (
  <div className="min-h-screen flex flex-col bg-stone-50 selection:bg-stone-900 selection:text-white">
   {isDemoMode && (
    <div className="bg-amber-500 text-white text-xs font-medium uppercase tracking-wider py-1.5 px-4 flex items-center justify-center gap-4 sticky top-0 z-[60]">
     <span>Demo Mode Active — No data will be saved</span>
     <button 
      onClick={() => toggleDemoMode(false)}
      className="underline hover:opacity-80 transition-opacity"
     >
      Exit Demo
     </button>
    </div>
   )}
   <Navbar />
   <main className="flex-grow">
    <Outlet />
   </main>
   <Footer />
  </div>
 );
}

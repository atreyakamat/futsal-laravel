'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ArenaSummary } from '@/lib/types';

export default function ArenaGrid({ arenas }: { arenas: ArenaSummary[] }) {
  const [search, setSearch] = useState('');

  const filteredArenas = arenas.filter((arena) =>
    arena.name.toLowerCase().includes(search.toLowerCase()) ||
    (arena.address?.toLowerCase() || '').includes(search.toLowerCase())
  );

  return (
    <section id="arenas" className="py-32 bg-dark">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="flex-1">
            <h2 className="text-4xl font-black mb-4 tracking-tighter uppercase">
              Our <span className="text-primary">Arenas</span>
            </h2>
            <div className="relative max-w-md group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-xl group-focus-within:text-primary transition-colors">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by arena name or location..."
                className="input-field pl-12"
              />
            </div>
          </div>
          <div className="text-right hidden md:block">
            <span className="text-primary font-black text-6xl italic text-stroke">
              {String(filteredArenas.length).padStart(2, '0')}
            </span>
            <span className="block text-white/40 text-[10px] tracking-[0.3em] font-bold uppercase mt-2">
              Available Spots
            </span>
          </div>
        </div>

        {filteredArenas.length === 0 ? (
          <div className="text-center py-24 glass-card border-dashed border-white/5">
            <span className="material-symbols-outlined text-8xl text-white/5 mb-6">search_off</span>
            <p className="text-white/40 font-bold uppercase tracking-[0.2em]">No arenas match your search.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
            {filteredArenas.map((arena) => (
              <div key={arena.id} className="group">
                <Link
                  href={`/arena/${arena.slug}`}
                  className="glass-card !p-0 block overflow-hidden transition-all duration-500 hover:shadow-[0_0_50px_rgba(13,242,32,0.1)]"
                >
                  <div className="h-72 overflow-hidden relative">
                    <img
                      src={arena.cover_image || 'https://images.unsplash.com/photo-1551958219-acbc608c6377?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      alt={arena.name}
                    />
                    <div className="absolute top-6 left-6">
                      <span className="pill-status">
                        Goa, IN
                      </span>
                    </div>
                  </div>
                  <div className="p-10">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h3 className="text-2xl font-black mb-3 group-hover:text-primary transition-colors uppercase tracking-tight">
                          {arena.name}
                        </h3>
                        <p className="text-white/40 text-xs flex items-center gap-2 font-bold uppercase tracking-widest">
                          <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                          <span>{arena.address}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-8 border-t border-white/5">
                      <div>
                        <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest block mb-2">Starting At</span>
                        <span className="text-3xl font-black text-white italic">
                          ₹{new Intl.NumberFormat().format(Number(arena.min_price))}
                          <small className="text-white/20 text-xs font-normal not-italic ml-2 tracking-tighter">/HR</small>
                        </span>
                      </div>
                      <span className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-black group-hover:rotate-45 transition-transform duration-500 shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined font-black">arrow_outward</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

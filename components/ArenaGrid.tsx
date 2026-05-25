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
            <div className="relative max-w-md">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-700 text-xl">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by arena name or location..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-800"
              />
            </div>
          </div>
          <div className="text-right hidden md:block">
            <span className="text-primary font-bold text-5xl">
              {String(filteredArenas.length).padStart(2, '0')}
            </span>
            <span className="block text-gray-600 text-[10px] tracking-widest font-bold uppercase mt-1">
              Available Spots
            </span>
          </div>
        </div>

        {filteredArenas.length === 0 ? (
          <div className="text-center py-24 glass rounded-3xl border-dashed border-white/10">
            <span className="material-symbols-outlined text-8xl text-gray-900 mb-6">search_off</span>
            <p className="text-gray-700 font-bold uppercase tracking-widest">No arenas match your search.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredArenas.map((arena) => (
              <div key={arena.id} className="group">
                <Link
                  href={`/arena/${arena.slug}`}
                  className="arena-card block glass rounded-[2rem] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10"
                >
                  <div className="h-64 overflow-hidden relative">
                    <img
                      src={arena.cover_image || 'https://images.unsplash.com/photo-1551958219-acbc608c6377?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      alt={arena.name}
                    />
                    <div className="absolute top-4 left-4">
                      <span className="glass px-3 py-1 rounded-full text-[10px] font-bold text-white tracking-widest uppercase">
                        Goa, IN
                      </span>
                    </div>
                  </div>
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                          {arena.name}
                        </h3>
                        <p className="text-gray-500 text-xs flex items-center gap-1.5 font-medium">
                          <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                          <span>{arena.address}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-6 border-t border-white/5">
                      <div>
                        <span className="text-gray-500 text-[10px] uppercase font-bold block mb-1">Starting At</span>
                        <span className="text-2xl font-black text-white italic">
                          ₹{new Intl.NumberFormat().format(Number(arena.min_price))}
                          <small className="text-gray-600 text-xs font-normal not-italic ml-1">/HR</small>
                        </span>
                      </div>
                      <span className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-black group-hover:translate-x-1 transition-transform">
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

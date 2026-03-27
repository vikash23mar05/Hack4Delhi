import React from 'react';
import { DELHI_WARDS } from '../constants';
import { useWardData } from '../contexts/WardDataContext';

const getCardColor = (aqi: number) => {
  if (aqi >= 300) return 'bg-[#ff6b6b]'; // Severe/Critical -> Red
  if (aqi >= 200) return 'bg-[#ffa262]'; // Poor -> Orange (Matches 136 string in screenshot mentally for high AQI)
  if (aqi >= 100) return 'bg-[#ffe259]'; // Moderate -> Yellow
  return 'bg-[#a6fc46]'; // Satisfactory -> Green (Matches 30 in screenshot)
};

const getTextColor = (aqi: number) => {
  // Deep charcoal text for all of these bright backgrounds
  return 'text-[#1a1a1a]';
};

const Sidebar: React.FC = () => {
  const { wards } = useWardData();
  const displayWards = wards.length > 0 ? wards : DELHI_WARDS;
  const topPollutedWards = [...displayWards].sort((a, b) => b.aqi - a.aqi).slice(0, 3);

  return (
    <aside className="hidden xl:flex w-[380px] shrink-0 flex-col border-r border-white/5 bg-[#0a0f0f] sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto p-6 custom-scrollbar">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest border-l-2 border-primary pl-3">Command Center</h3>
          <span className="text-[10px] text-primary bg-primary/10 px-2 py-1 rounded-full font-bold">LIVE METRICS</span>
        </div>
        
        <div className="space-y-6">
          {topPollutedWards.map((ward) => {
            const cardBg = getCardColor(ward.aqi);
            const textColor = getTextColor(ward.aqi);
            
            return (
              <div key={ward.id} className={`${cardBg} ${textColor} rounded-[2rem] p-5 shadow-2xl relative overflow-hidden transition-transform hover:-translate-y-1 duration-300`}>
                
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-lg opacity-80 cursor-pointer hover:opacity-100">west</span>
                  <span className="text-sm font-semibold tracking-tight">{ward.name}</span>
                </div>

                {/* AQI Section */}
                <div className="text-[80px] font-medium leading-[0.9] tracking-tighter mb-1 mt-3">
                  {ward.aqi}
                </div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[13px] font-semibold opacity-80">AQI — {ward.status}</span>
                  <div className="flex gap-2 opacity-60">
                    <span className="material-symbols-outlined text-sm cursor-pointer hover:opacity-100">cloud_download</span>
                    <span className="material-symbols-outlined text-sm cursor-pointer hover:opacity-100">share</span>
                  </div>
                </div>

                {/* Particulates / Sources White Box */}
                <div className="bg-white rounded-[1.5rem] p-5 mb-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Emissions Profile</h4>
                  <div className="flex relative">
                    {/* Divider line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-gray-100 -translate-x-1/2"></div>
                    
                    {/* Left Col (Vehicular) */}
                    <div className="flex-1 pr-2 truncate">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-[#1a1a1a] truncate">{Math.round(ward.sourceDistribution.vehicular)}%</span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium truncate">Vehicular · {Math.round(ward.aqi * 0.4)} µg/m³</div>
                      
                      {/* Generative Dot Grid representing density */}
                      <svg viewBox="0 0 100 40" className="w-full h-10 mt-3 opacity-60 text-orange-500" fill="currentColor">
                        <circle cx="10" cy="30" r="2.5"/><circle cx="20" cy="25" r="3"/><circle cx="35" cy="35" r="2"/>
                        <circle cx="15" cy="15" r="1.5"/><circle cx="5" cy="20" r="2"/><circle cx="30" cy="10" r="1"/>
                        <circle cx="45" cy="28" r="2.5"/><circle cx="55" cy="22" r="1.5"/><circle cx="25" cy="32" r="2"/>
                        <circle cx="65" cy="35" r="3.5"/><circle cx="75" cy="18" r="1.5"/><circle cx="85" cy="28" r="2"/>
                        <circle cx="95" cy="30" r="2"/><circle cx="40" cy="15" r="2"/><circle cx="50" cy="35" r="1.5"/>
                      </svg>
                    </div>

                    {/* Right Col (Industrial) */}
                    <div className="flex-1 pl-4 truncate">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-[#1a1a1a] truncate">{Math.round(ward.sourceDistribution.industrial)}%</span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium truncate">Industrial · {Math.round(ward.aqi * 0.3)} µg/m³</div>
                      
                      {/* Generative Dot Grid (Denser if high %) */}
                      <svg viewBox="0 0 100 40" className="w-full h-10 mt-3 opacity-60 text-yellow-500" fill="currentColor">
                         <circle cx="10" cy="10" r="1.5"/><circle cx="22" cy="15" r="2.5"/><circle cx="35" cy="5" r="1"/>
                         <circle cx="50" cy="25" r="2"/><circle cx="60" cy="12" r="3"/><circle cx="70" cy="30" r="1.5"/>
                         <circle cx="85" cy="8" r="2"/><circle cx="95" cy="20" r="2.5"/><circle cx="15" cy="30" r="1"/>
                         <circle cx="28" cy="28" r="2"/><circle cx="42" cy="18" r="1.5"/><circle cx="78" cy="22" r="2"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Weather Metrics */}
                <div className="flex justify-between items-center px-3 mb-6 opacity-80">
                  <div className="flex flex-col items-center">
                    <span className="material-symbols-outlined text-[16px] mb-1">device_thermostat</span>
                    <span className="font-bold text-sm">{ward.weather?.temperature || 34}</span>
                    <span className="text-[9px] font-semibold mt-0.5 uppercase">°C</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="material-symbols-outlined text-[16px] mb-1">water_drop</span>
                    <span className="font-bold text-sm">{ward.weather?.humidity || 52}</span>
                    <span className="text-[9px] font-semibold mt-0.5 uppercase">%</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="material-symbols-outlined text-[16px] mb-1">air</span>
                    <span className="font-bold text-sm">{ward.weather?.pressure || 1012}</span>
                    <span className="text-[9px] font-semibold mt-0.5 uppercase">hPa</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="material-symbols-outlined text-[16px] mb-1">near_me</span>
                    <span className="font-bold text-sm">{ward.weather?.windSpeed || 14}</span>
                    <span className="text-[9px] font-semibold mt-0.5 uppercase">km/h</span>
                  </div>
                </div>

                {/* Refresh Pill Button */}
                <div className="bg-[#1a1a1a] rounded-full p-1.5 flex items-center justify-between text-white shadow-lg cursor-pointer hover:bg-black transition-colors">
                  <div className={`size-10 rounded-full flex items-center justify-center text-[#1a1a1a] shadow-inner font-bold ${cardBg}`}>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] mr-5 opacity-80 text-center flex-1">
                    Refresh ...
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

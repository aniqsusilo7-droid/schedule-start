
import React, { useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { ScheduleItem, ReactorConfig } from '../types';
import { GRADE_COLORS } from '../constants';
import { format, addMinutes, differenceInMinutes } from 'date-fns';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle, Info } from 'lucide-react';

interface TimelineProps {
  scheduleMatrix: Record<string, ScheduleItem[]>;
  reactors: ReactorConfig[];
  now: Date;
  batchDurationMinutes?: number;
  onItemClick?: (item: ScheduleItem) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ 
  scheduleMatrix, 
  reactors, 
  now, 
  batchDurationMinutes = 120, // Default 2 hours
  onItemClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const allItems = useMemo(() => {
    return Object.values(scheduleMatrix).flat() as ScheduleItem[];
  }, [scheduleMatrix]);

  const timeRange = useMemo(() => {
    if (allItems.length === 0) return [now, addMinutes(now, 24 * 60)];
    
    const minDate = d3.min(allItems, (d: ScheduleItem) => d.startTime) || now;
    const maxDate = d3.max(allItems, (d: ScheduleItem) => addMinutes(d.startTime, batchDurationMinutes)) || addMinutes(now, 24 * 60);
    
    // Add some padding
    return [addMinutes(minDate, -60), addMinutes(maxDate, 60)];
  }, [allItems, now, batchDurationMinutes]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || allItems.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = reactors.length * 60 + 60; // 60px per reactor + 60px for axis

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const x = d3.scaleTime()
      .domain(timeRange)
      .range([0, chartWidth]);

    const y = d3.scaleBand()
      .domain(reactors.map(r => r.id))
      .range([0, chartHeight])
      .padding(0.3);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x)
        .ticks(d3.timeHour.every(2))
        .tickSize(-chartHeight)
        .tickFormat(() => '')
      )
      .style('stroke', '#e2e8f0')
      .style('stroke-opacity', 0.5);

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x)
        .ticks(d3.timeHour.every(2))
        .tickFormat(d => d3.timeFormat('%H:%M')(d as Date))
      )
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('color', '#64748b');

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(y))
      .style('font-size', '14px')
      .style('font-weight', '800')
      .style('color', '#1e293b');

    // Current time line
    const nowX = x(now);
    if (nowX >= 0 && nowX <= chartWidth) {
      g.append('line')
        .attr('x1', nowX)
        .attr('x2', nowX)
        .attr('y1', 0)
        .attr('y2', chartHeight)
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,2');

      g.append('text')
        .attr('x', nowX)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ef4444')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text('NOW');
    }

    // Bars
    const bars = g.selectAll('.bar')
      .data(allItems.filter(d => d.status !== 'skipped'))
      .enter()
      .append('g')
      .attr('class', 'bar-group');

    bars.append('rect')
      .attr('x', (d: ScheduleItem) => x(d.startTime))
      .attr('y', (d: ScheduleItem) => y(d.reactorId) || 0)
      .attr('width', (d: ScheduleItem) => x(addMinutes(d.startTime, batchDurationMinutes)) - x(d.startTime))
      .attr('height', y.bandwidth())
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', (d: ScheduleItem) => {
        const colorClass = GRADE_COLORS[d.grade] || 'bg-slate-500';
        // Extract hex from tailwind or use a map
        const colorMap: Record<string, string> = {
          'bg-red-600': '#dc2626',
          'bg-orange-500': '#f97316',
          'bg-yellow-300': '#fde047',
          'bg-green-600': '#16a34a',
          'bg-blue-600': '#2563eb',
          'bg-purple-600': '#9333ea',
          'bg-slate-500': '#64748b'
        };
        return colorMap[colorClass] || '#64748b';
      })
      .attr('opacity', (d: ScheduleItem) => d.status === 'past' ? 0.4 : 0.9)
      .attr('stroke', (d: ScheduleItem) => d.status === 'active' ? '#fff' : 'none')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (onItemClick) onItemClick(d as ScheduleItem);
      })
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 1);
      })
      .on('mouseout', function(event, d) {
        const item = d as ScheduleItem;
        d3.select(this).attr('opacity', item.status === 'past' ? 0.4 : 0.9);
      });

    bars.append('text')
      .attr('x', (d: ScheduleItem) => x(d.startTime) + 5)
      .attr('y', (d: ScheduleItem) => (y(d.reactorId) || 0) + y.bandwidth() / 2 + 5)
      .attr('fill', (d: ScheduleItem) => d.grade === 'SLK' ? '#000' : '#fff')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text((d: ScheduleItem) => `${d.batchNumber} (${d.grade})`);

    // Conflict detection (simple overlap)
    const conflicts: { rId: string, t1: Date, t2: Date }[] = [];
    reactors.forEach(r => {
      const items = allItems
        .filter(d => d.reactorId === r.id && d.status !== 'skipped')
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      
      for (let i = 0; i < items.length - 1; i++) {
        const current = items[i];
        const next = items[i+1];
        const currentEnd = addMinutes(current.startTime, batchDurationMinutes);
        
        if (currentEnd > next.startTime) {
          conflicts.push({ rId: r.id, t1: next.startTime, t2: currentEnd });
        }
      }
    });

    // Draw conflict indicators
    g.selectAll('.conflict')
      .data(conflicts)
      .enter()
      .append('rect')
      .attr('x', d => x(d.t1))
      .attr('y', d => (y(d.rId) || 0))
      .attr('width', d => x(d.t2) - x(d.t1))
      .attr('height', y.bandwidth())
      .attr('fill', 'url(#conflict-gradient)')
      .attr('opacity', 0.5)
      .attr('pointer-events', 'none');

    // Define gradient for conflicts
    const defs = svg.append('defs');
    const gradient = defs.append('pattern')
      .attr('id', 'conflict-gradient')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 10)
      .attr('height', 10)
      .attr('patternTransform', 'rotate(45)');
    
    gradient.append('rect')
      .attr('width', 10)
      .attr('height', 10)
      .attr('fill', '#ef4444');
    
    gradient.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', 10)
      .attr('stroke', '#fff')
      .attr('stroke-width', 4);

  }, [allItems, reactors, now, timeRange, batchDurationMinutes]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
    >
      <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500 rounded-xl text-white">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Reactor Timeline</h3>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Visual Schedule & Conflict Detection</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Conflict</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scheduled</span>
          </div>
        </div>
      </div>

      <div className="p-6" ref={containerRef}>
        <div className="overflow-x-auto">
          <svg ref={svgRef} className="min-w-full"></svg>
        </div>
      </div>

      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
        <Info className="w-4 h-4 text-indigo-500" />
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Timeline shows batch start times and estimated durations. Red hatched areas indicate potential reactor overlaps.
        </p>
      </div>
    </motion.div>
  );
};

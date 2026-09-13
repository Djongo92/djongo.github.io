import React, { useState, useEffect } from 'react';

export function AnimatedCounter({ value }: { value: number | string }) {
  const [count, setCount] = useState(0);
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g,"")) : value;
  const isString = typeof value === 'string';
  
  useEffect(() => {
    if (isNaN(numericValue)) return;
    
    const duration = 1000;
    const steps = 30;
    const stepTime = duration / steps;
    const increment = numericValue / steps;
    
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setCount(numericValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, stepTime);
    
    return () => clearInterval(timer);
  }, [numericValue]);
  
  if (isNaN(numericValue)) return <span>{value}</span>;
  
  return <span>{isString ? value.toString().replace(/[0-9.]+/, count.toString()) : count}</span>;
}

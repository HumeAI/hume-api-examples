import { NextResponse } from 'next/server';
import { fetchWeather } from '@/utils/fetchWeather';

export async function POST(request: Request) {
  const { parameters } = await request.json();

  try {
    const currentWeather = await fetchWeather(parameters);
    return NextResponse.json({ success: true, data: currentWeather });
  } catch (error) {
    console.error('Error in fetchWeather API route:', error);
    return NextResponse.json({ success: false, error: 'Weather tool error' }, { status: 500 });
  }
}
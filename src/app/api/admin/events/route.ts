
import { NextResponse } from 'next/server';
import { adminGetAllEvents, createEvent } from '@/lib/mockData';
import { EventFormSchema } from '@/lib/types';

// Interface for the raw show time object from the request body before date parsing
interface RawShowTimeInput {
  id?: string;
  dateTime: string; // Expecting string from JSON
  ticketAvailabilities: Array<{
    id?: string;
    ticketTypeId: string;
    ticketTypeName: string;
    availableCount: number;
  }>;
  // Allow other properties from ...st if they exist in the raw input
  [key: string]: unknown; 
}


export async function GET() {
  try {
    const events = await adminGetAllEvents();
    return NextResponse.json(events);
  } catch (error: unknown) {
    console.error('API Error fetching all admin events:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch events';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Parse date strings into Date objects before validation
    const bodyWithParsedDates = {
      ...body,
      date: body.date ? new Date(body.date) : undefined,
      showTimes: body.showTimes?.map((st: RawShowTimeInput) => ({
        ...st,
        dateTime: st.dateTime ? new Date(st.dateTime) : undefined,
        // ticketAvailabilities are already numbers/strings, Zod handles parsing numbers
      })) || [],
      // ticketTypes prices/availability are already numbers
    };

    const validatedData = EventFormSchema.safeParse(bodyWithParsedDates);

    if (!validatedData.success) {
      console.error('API Validation Error creating event:', validatedData.error.flatten().fieldErrors);
      return NextResponse.json(
        { message: 'Invalid event data provided', errors: validatedData.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    // The createEvent service function expects EventFormData, which now has IDs on ticketTypes and showTimes that might be client-generated.
    // The service layer will handle turning client-side temp IDs into DB IDs or ignoring them for new records.
    const newEvent = await createEvent(validatedData.data);
    return NextResponse.json(newEvent, { status: 201 });
  } catch (error: unknown) {
    console.error('API Error creating event:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create event';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


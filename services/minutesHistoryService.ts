
import { supabase } from './supabaseClient';

export interface SavedMinute {
    id: string;
    timestamp: string;
    condoName: string;
    minutesHtml: string;
    condoLogo?: string | null;
    fileName?: string;
    previewText?: string;
    companyName?: string;
    companyLogo?: string | null;
    meetingDate?: string;
    meetingStartTime?: string;
    meetingEndTime?: string;
}

export async function getMinutesHistory(): Promise<SavedMinute[]> {
    const { data, error } = await supabase
        .from('atas_history')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching minutes history:', error);
        return [];
    }

    return data.map((item: any) => ({
        id: item.id,
        timestamp: item.created_at,
        condoName: item.condo_name,
        minutesHtml: item.minutes_html,
        condoLogo: item.condo_logo_url,
        fileName: item.file_name,
        previewText: item.preview_text,
        companyName: item.company_name,
        companyLogo: item.company_logo_url,
        meetingDate: item.meeting_date,
        meetingStartTime: item.meeting_start_time,
        meetingEndTime: item.meeting_end_time
    }));
}

export async function saveMinute(minute: Omit<SavedMinute, 'id' | 'timestamp'>) {
    const { data, error } = await supabase
        .from('atas_history')
        .insert([
            {
                condo_name: minute.condoName,
                minutes_html: minute.minutesHtml,
                condo_logo_url: minute.condoLogo,
                file_name: minute.fileName,
                preview_text: minute.previewText,
                company_name: minute.companyName,
                company_logo_url: minute.companyLogo,
                meeting_date: minute.meetingDate,
                meeting_start_time: minute.meetingStartTime,
                meeting_end_time: minute.meetingEndTime
            }
        ])
        .select()
        .single();

    if (error) {
        console.error('Error saving minute:', error);
        return null;
    }

    return data?.id;
}

export async function deleteMinute(id: string) {
    const { error } = await supabase
        .from('atas_history')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting minute:', error);
    }
}

export async function getMinuteById(id: string): Promise<SavedMinute | null> {
    const { data, error } = await supabase
        .from('atas_history')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        console.error('Error fetching minute by id:', error);
        return null;
    }

    return {
        id: data.id,
        timestamp: data.created_at,
        condoName: data.condo_name,
        minutesHtml: data.minutes_html,
        condoLogo: data.condo_logo_url,
        fileName: data.file_name,
        previewText: data.preview_text,
        companyName: data.company_name,
        companyLogo: data.company_logo_url,
        meetingDate: data.meeting_date,
        meetingStartTime: data.meeting_start_time,
        meetingEndTime: data.meeting_end_time
    };
}

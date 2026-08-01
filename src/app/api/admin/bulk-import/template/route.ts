import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const clientsEnabled = request.nextUrl.searchParams.get('clientsEnabled') !== 'false';

    const wb = XLSX.utils.book_new();

    let headers: string[];
    let sampleData: (string | number)[][];
    let colWidths: { wch: number }[];

    if (clientsEnabled) {
      // Full template — column indices match ExcelParserService COLUMN_MAPPING
      headers = [
        'No',                    // A - 0
        'Batch (DOH) *',         // B - 1
        'Batch Mentor',          // C - 2
        'Source *',              // D - 3
        'Status',                // E - 4
        'Rating',                // F - 5
        'Name *',                // G - 6
        'Contact Number',        // H - 7
        'Official Mail ID',      // I - 8
        'Personal Mail ID',      // J - 9
        'YOE - A (unused)',      // K - 10
        'YOE - P',               // L - 11
        'Skill Set *',           // M - 12
        'YOP',                   // N - 13
        'No of Interviews',      // O - 14
        'Interview Mentor Name', // P - 15
        'Client Name',           // Q - 16
      ];
      sampleData = [
        [1, 'Batch-2024-Q1', 'Mentor A', 'B2B',    'RFD', 'ASSET',  'John Doe',     '9876543210', 'john@company.com', 'john@gmail.com', 5.5, 6.0, 'JAVA_SB',  2019, 2, 'Interview Mentor 1', 'TechCorp'],
        [2, 'Batch-2024-Q1', 'Mentor B', 'BENCH',  'RFD', 'MEDIUM', 'Jane Smith',   '9876543211', 'jane@company.com', 'jane@gmail.com', 3.0, 4.0, 'REACT_JS', 2021, 1, 'Interview Mentor 2', 'StartupXYZ'],
        [3, 'Batch-2024-Q2', 'Mentor A', 'MARKET', 'WFD', 'ASSET',  'Mike Johnson', '9876543212', 'mike@company.com', 'mike@gmail.com', 7.0, 8.0, 'JFSR',     2017, 0, '', ''],
      ];
      colWidths = [
        { wch: 5 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
        { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 10 }, { wch: 10 },
        { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 15 },
      ];
    } else {
      // Compact template — CLIENTS columns removed; indices match COMPACT_COLUMN_MAPPING in ExcelParserService
      headers = [
        'No',               // A - 0
        'Name *',           // B - 1
        'Contact Number',   // C - 2
        'Official Mail ID', // D - 3
        'Personal Mail ID', // E - 4
        'YOE - P',          // F - 5
        'Skill Set *',      // G - 6
        'YOP',              // H - 7
        'No of Interviews', // I - 8
      ];
      sampleData = [
        [1, 'John Doe',     '9876543210', 'john@company.com', 'john@gmail.com', 6.0, 'JAVA_SB',  2019, 2],
        [2, 'Jane Smith',   '9876543211', 'jane@company.com', 'jane@gmail.com', 4.0, 'REACT_JS', 2021, 1],
        [3, 'Mike Johnson', '9876543212', 'mike@company.com', 'mike@gmail.com', 8.0, 'JFSR',     2017, 0],
      ];
      colWidths = [
        { wch: 5 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 25 },
        { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 },
      ];
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, 'Candidate');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Candidate_Bulk_Import_Template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Template download error:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}

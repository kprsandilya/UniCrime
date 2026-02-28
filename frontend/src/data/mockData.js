export const mockData = [
  {
    Number: "2024-001",
    Reported_Date_Time: "2024-01-15T09:30:00",
    Occurred_From_Date_Time: "2024-01-15T08:00:00",
    Location: "Main Library",
    Description: "Theft",
    Disposition: "Closed",
    School_Code: "LIB",
    latitude: 40.4406,
    longitude: -79.9959,
  },
  {
    Number: "2024-002",
    Reported_Date_Time: "2024-01-16T14:20:00",
    Occurred_From_Date_Time: "2024-01-16T13:45:00",
    Location: "Student Union",
    Description: "Disturbance",
    Disposition: "Open",
    School_Code: "UNION",
    latitude: 40.4410,
    longitude: -79.9962,
  },
  {
    Number: "2024-003",
    Reported_Date_Time: "2024-01-17T11:00:00",
    Occurred_From_Date_Time: "2024-01-17T10:30:00",
    Location: "Cathedral of Learning",
    Description: "Vandalism",
    Disposition: "Closed",
    School_Code: "CL",
    latitude: 40.4443,
    longitude: -79.9623,
  },
  {
    Number: "2024-004",
    Reported_Date_Time: "2024-01-18T16:45:00",
    Occurred_From_Date_Time: "2024-01-18T16:00:00",
    Location: "Main Library",
    Description: "Theft",
    Disposition: "Under Investigation",
    School_Code: "LIB",
    latitude: 40.4406,
    longitude: -79.9959,
  },
  {
    Number: "2024-005",
    Reported_Date_Time: "2024-01-19T08:15:00",
    Occurred_From_Date_Time: "2024-01-19T07:50:00",
    Location: "Benedum Hall",
    Description: "Trespassing",
    Disposition: "Closed",
    School_Code: "ENG",
    latitude: 40.4432,
    longitude: -79.9598,
  },
  {
    Number: "2024-006",
    Reported_Date_Time: "2024-01-20T12:30:00",
    Occurred_From_Date_Time: "2024-01-20T12:00:00",
    Location: "Student Union",
    Description: "Disturbance",
    Disposition: "Open",
    School_Code: "UNION",
    latitude: 40.4410,
    longitude: -79.9962,
  },
  {
    Number: "2024-007",
    Reported_Date_Time: "2024-01-21T09:00:00",
    Occurred_From_Date_Time: "2024-01-21T08:30:00",
    Location: "Cathedral of Learning",
    Description: "Theft",
    Disposition: "Closed",
    School_Code: "CL",
    latitude: 40.4443,
    longitude: -79.9623,
  },
  {
    Number: "2024-008",
    Reported_Date_Time: "2024-01-22T15:20:00",
    Occurred_From_Date_Time: "2024-01-22T14:45:00",
    Location: "Hillman Library",
    Description: "Vandalism",
    Disposition: "Under Investigation",
    School_Code: "LIB",
    latitude: 40.4398,
    longitude: -79.9589,
  },
  {
    Number: "2024-009",
    Reported_Date_Time: "2024-01-23T10:10:00",
    Occurred_From_Date_Time: "2024-01-23T09:50:00",
    Location: "Benedum Hall",
    Description: "Disturbance",
    Disposition: "Closed",
    School_Code: "ENG",
    latitude: 40.4432,
    longitude: -79.9598,
  },
  {
    Number: "2024-010",
    Reported_Date_Time: "2024-01-24T13:00:00",
    Occurred_From_Date_Time: "2024-01-24T12:30:00",
    Location: "Student Union",
    Description: "Theft",
    Disposition: "Open",
    School_Code: "UNION",
    latitude: 40.4410,
    longitude: -79.9962,
  },
];

export function generateSummary(records) {
  if (!records || records.length === 0) {
    return {
      totalReports: 0,
      reportsByDisposition: {},
      reportsBySchool: {},
      earliestOccurred: "",
      latestOccurred: "",
      lastUpdated: new Date().toISOString(),
    };
  }
  const reportsByDisposition = {};
  const reportsBySchool = {};
  let earliestOccurred = records[0].Occurred_From_Date_Time;
  let latestOccurred = records[0].Occurred_From_Date_Time;
  for (const r of records) {
    if (r.Disposition) reportsByDisposition[r.Disposition] = (reportsByDisposition[r.Disposition] || 0) + 1;
    if (r.School_Code) reportsBySchool[r.School_Code] = (reportsBySchool[r.School_Code] || 0) + 1;
    if (r.Occurred_From_Date_Time < earliestOccurred) earliestOccurred = r.Occurred_From_Date_Time;
    if (r.Occurred_From_Date_Time > latestOccurred) latestOccurred = r.Occurred_From_Date_Time;
  }
  return {
    totalReports: records.length,
    reportsByDisposition,
    reportsBySchool,
    earliestOccurred,
    latestOccurred,
    lastUpdated: new Date().toISOString(),
  };
}

-- Latest rounds and statuses
SELECT chainRoundId, roundNo, pairSymbol, status, startTime, endTime, createdAt
FROM "Round"
ORDER BY createdAt DESC
LIMIT 20;

-- Upcoming rounds
SELECT chainRoundId, status, startTime
FROM "Round"
WHERE status='UPCOMING'
ORDER BY startTime ASC
LIMIT 20;

-- Canceled rounds
SELECT chainRoundId, status, updatedAt
FROM "Round"
WHERE status='CANCELED'
ORDER BY updatedAt DESC
LIMIT 20;

-- Uniqueness sanity
SELECT chainRoundId, COUNT(*)
FROM "Round"
GROUP BY chainRoundId
HAVING COUNT(*)>1;
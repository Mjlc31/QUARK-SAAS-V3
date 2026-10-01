import asyncio
import os
import sys

# Try fetching using aiohttp just to see the exact SSE response
import aiohttp

async def main():
    url = "http://localhost:5678/mcp-server/http"
    headers = {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5MmM1ZjI4Zi1kNDQ3LTRkOGEtOTIyYS0xYTdjZjJhZTUwYmUiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjZlNTgxZjkxLWE1YTgtNDI0ZS1iMWNjLWRjNDg4ZDBlMGVlYyIsImlhdCI6MTc5MDIyOTQxOH0.0s4l6D8gcameG9O4VBNDczT69Ij_8NuvlFHQbLXVDBs",
        "Accept": "text/event-stream"
    }
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as resp:
            print("Status:", resp.status)
            print("Headers:", resp.headers)
            body = await resp.text()
            print("Body:", body[:500])

asyncio.run(main())

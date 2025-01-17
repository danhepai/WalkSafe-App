from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
import a_star_module as a
import asyncio

refresh_done_event = asyncio.Event()


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(refresh_data())
    yield


app = FastAPI(lifespan=lifespan)


async def refresh_data():
    while True:
        print("Refreshed data")
        a.refresh_data()
        refresh_done_event.set()
        await asyncio.sleep(1800)


# output json data
@app.post("/routes/")
async def run_a_star(data: dict):
    await refresh_done_event.wait()
    try:
        start = data.get("start")
        finish = data.get("finish")
        tags = data.get("tags")

        # Validate required fields
        if not start or not finish:
            raise HTTPException(status_code=400, detail="Invalid input: 'graph', 'start', 'tags'.")

        path = a.a_star((start["latitude"], start["longitude"]), (finish["latitude"], finish["longitude"]), 1, tags)

        if not path:
            print("There has been an error")
            raise HTTPException(status_code=404, detail="No path found")
        print("We got a path enjoy")
        return path

    except Exception as e:
        print(str(e))
        raise HTTPException(status_code=500, detail="Internal issues")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api_code:app", host="127.0.0.1", port=8001, reload=True)

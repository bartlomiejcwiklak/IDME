[<img width="auto" height="150" alt="logo" src="https://github.com/user-attachments/assets/3083f82d-827a-4de9-a794-7678f3bea9f9" />](https://bartlomiejcwiklak.github.io/IDME/)

is a song guessing game, where the player is presented with a snippet of a song.


### how to run

you can use the pre-built demo deployment [here](https://bartlomiejcwiklak.github.io/IDME/) to skip all the hassle

but, if you'd rather not do that, then:

```bash
npm install && npm run dev
```
will do the trick just as well.


### key features

- **live itunes integration**: real-time access to millions of tracks with high-quality previews.
- **global & regional pools**: choose between global hits or deep-dive into curated polish music catalogs.
- **artist fan mode**: enter any artist's name to fetch their entire discography and prove you're a true fan.
- **decades journey**: relive the hits from the **80s, 90s, 00s, and 10s**.
- **gaming osts**: iconic soundtracks from legendary video games.
- **stats & streaks**: comprehensive tracking of your current streak, best streak, and total solved tracks.

### gallery
<img width="1710" height="878" alt="Screenshot 2026-04-30 at 22 38 34" src="https://github.com/user-attachments/assets/acee6932-b48f-4413-a928-b94246005dee" />
<img width="1710" height="878" alt="Screenshot 2026-04-30 at 22 39 27" src="https://github.com/user-attachments/assets/f12ebcd6-45e6-493d-aec3-80eb604d566f" />

### tech stack

- **core:** react 18 + typescript
- **bundler:** vite
- **styling:** tailwind css (custom design system)
- **state management:** custom react hooks for game engine and song pooling
- **api proxy:** [cloudflare workers](https://workers.cloudflare.com/) (handling itunes api requests)

### credits + acknowledgements
- created by [**bartlomiej cwiklak**](https://bartlomiejcwiklak.com)
- tested by **Liify, kolczastyy, jaca, czzk and kubula**
- the main logo uses the Dirtyline font.

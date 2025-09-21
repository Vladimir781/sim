
## Работа с ассетами

Бинарные ассеты конвертированы в текстовые модули:

- `game/assets/spritesheet.b64.js` — base64 строка спрайтов.
- `game/assets/emoji_bitmap.b64.js` — base64 строка эмодзи.

Для повторной конвертации используйте утилиту `tools/asset2b64.ts`:

```bash
npx ts-node tools/asset2b64.ts path/to/image.png game/assets/my_texture.b64.js --export MY_TEXTURE_B64 --mime image/png
```

Скрипт читает файл, кодирует содержимое в base64, подставляет data-URI и генерирует модуль ES с именованным экспортом.

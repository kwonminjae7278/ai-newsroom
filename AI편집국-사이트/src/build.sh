#!/bin/bash
# src/의 조각 파일들을 합쳐서 상위 폴더의 index.html을 다시 만든다.  사용: bash src/build.sh
cd "$(dirname "$0")"
{ echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'
  cat part1_css.html part2_html.html; echo '<script>'; cat part3_core.js part3b_life.js part4_webtoon.js part5_pipeline.js part5b_podcast.js part6_reader.js; echo '</script>'
  echo '</body></html>'; } > ../index.html
echo "index.html 다시 만듦"

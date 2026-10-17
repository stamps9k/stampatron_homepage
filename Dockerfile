# Static site - no build step, just ship the pre-built HTML/CSS/JS into nginx.
FROM nginx:stable-alpine
COPY www/ /usr/share/nginx/html/


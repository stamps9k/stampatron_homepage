(function () {
  var list = document.getElementById('github-feed-list');
  if (!list) return;

  fetch('https://api.github.com/users/stamps9k/repos?sort=pushed&per_page=8')
    .then(function (res) {
      if (!res.ok) throw new Error('GitHub API error: ' + res.status);
      return res.json();
    })
    .then(function (repos) {
      list.innerHTML = '';
      repos.forEach(function (repo) {
        var li = document.createElement('li');

        var link = document.createElement('a');
        link.href = repo.html_url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.className = 'repo-name small';
        link.textContent = repo.name;

        var time = document.createElement('span');
        time.className = 'text-muted-custom small text-nowrap';
        time.textContent = timeAgo(new Date(repo.pushed_at));

        li.appendChild(link);
        li.appendChild(time);
        list.appendChild(li);
      });
    })
    .catch(function () {
      list.innerHTML = '<li class="text-muted-custom small">Activity feed unavailable.</li>';
    });

  function timeAgo(date) {
    var seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    var units = [['y', 31536000], ['mo', 2592000], ['w', 604800], ['d', 86400], ['h', 3600], ['m', 60]];
    for (var i = 0; i < units.length; i++) {
      var val = Math.floor(seconds / units[i][1]);
      if (val >= 1) return val + units[i][0] + ' ago';
    }
    return 'just now';
  }
})();
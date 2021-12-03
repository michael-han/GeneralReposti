module.exports = {
    apps: [{
        name: "worker",
        script: 'src/bot.js'
    }],
    deploy : {
        production : {
        user: 'michael',
        host: '144.172.75.171',
        ref : 'origin/master',
        repo: 'git@github.com:michael-han/GeneralReposti.git',
        path: '/home/production',
        ssh_options: "StrictHostKeyChecking=no",
        'post-deploy': 'npm install && pm2 startOrRestart ecosystem.config.js',
        'pre-setup': ''
        }
    }
};

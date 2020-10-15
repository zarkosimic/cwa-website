import { Chart, LineController, Line, Point, LinearScale, CategoryScale, Title, Tooltip, Filler, Legend } from 'chart.js';
Chart.register(LineController, Line, Point, LinearScale, CategoryScale, Title, Tooltip, Filler, Legend);
import $ from 'jquery';

class Charts {
    init() {
        const chartConfig = $("#chartConfiguration").data("config");
        $.getJSON( "/assets/data-and-facts-external-data.json", function(data) { 
            data.types.forEach(chartData => {
                chartConfig.forEach(chart => {
                    if(chart.dataKey === Object.keys(chartData)[0]) {
                        const ctx = document.getElementById(chart.dataKey).getContext('2d');
                        chart.settings.data = chartData[chart.dataKey];
                        const newChart = new Chart(ctx, chart.settings);
                    }
                });
            });
        })
    }
}

export default new Charts();
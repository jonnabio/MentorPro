// Monitor Interface JavaScript
class MonitorInterface {
    constructor() {
        this.currentProvider = 'openai';
        this.selectedModel = null;
        this.refreshInterval = null;
        this.activityLog = [];
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0
        };

        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadInitialData();
        this.startAutoRefresh();
        this.log('Monitor interface initialized');
    }

    setupEventListeners() {
        // Provider toggle buttons
        document.querySelectorAll('.btn-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const providerId = e.target.closest('.provider-card').dataset.provider;
                this.toggleProvider(providerId);
            });
        });

        // Refresh provider status button
        document.getElementById('refreshProviderBtn')?.addEventListener('click', () => {
            this.refreshStatus();
        });

        // Cost mode selector
        const costModeSelect = document.getElementById('costMode');
        if (costModeSelect) {
            costModeSelect.addEventListener('change', (e) => {
                this.filterModelsByCost(e.target.value);
            });
        }

        // Model selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.model-card')) {
                const modelCard = e.target.closest('.model-card');
                this.selectModel(modelCard.dataset.model, modelCard.dataset.provider);
            }
        });

        // Action buttons
        document.getElementById('refreshStatus')?.addEventListener('click', () => {
            this.refreshStatus();
        });

        document.getElementById('testConnectionBtn')?.addEventListener('click', () => {
            this.testConnection();
        });

        document.getElementById('testModelBtn')?.addEventListener('click', () => {
            this.testSelectedModel();
        });

        document.getElementById('saveConfigBtn')?.addEventListener('click', () => {
            this.saveModelConfiguration();
        });

        document.getElementById('exportConfigBtn')?.addEventListener('click', () => {
            this.exportLogs();
        });

        document.getElementById('resetConfigBtn')?.addEventListener('click', () => {
            this.resetConfiguration();
        });

        document.getElementById('clearLogs')?.addEventListener('click', () => {
            this.clearLogs();
        });

        document.getElementById('exportLogs')?.addEventListener('click', () => {
            this.exportLogs();
        });

        // Navigation
        document.getElementById('backToQuiz')?.addEventListener('click', () => {
            window.location.href = '/quiz.html';
        });
    }

    async loadInitialData() {
        this.showLoading('Loading monitor data...');
        
        try {
            await Promise.all([
                this.loadProviderStatus(),
                this.loadAvailableModels(),
                this.loadMetrics(),
                this.loadRecentActivity()
            ]);
        } catch (error) {
            this.showToast('Failed to load initial data', 'error');
            console.error('Error loading initial data:', error);
        } finally {
            this.hideLoading();
        }
    }

    async loadProviderStatus() {
        try {
            const response = await fetch('/api/providers/status');
            const data = await response.json();
            
            if (data.success) {
                this.updateProviderCards(data.providers);
            }
        } catch (error) {
            console.error('Error loading provider status:', error);
            this.updateProviderCards({
                openai: { status: 'offline', error: 'Connection failed' },
                openrouter: { status: 'offline', error: 'Connection failed' }
            });
        }
    }

    async loadAvailableModels() {
        try {
            const response = await fetch('/api/models');
            const data = await response.json();
            
            if (data.success) {
                this.updateModelsDisplay(data.models);
                this.selectedModel = data.currentModel;
                this.currentProvider = data.currentProvider;
            }
        } catch (error) {
            console.error('Error loading models:', error);
            this.showToast('Failed to load available models', 'error');
        }
    }

    async loadMetrics() {
        try {
            const response = await fetch('/api/metrics');
            const data = await response.json();
            
            if (data.success) {
                this.updateMetricsDisplay(data.metrics);
            }
        } catch (error) {
            console.error('Error loading metrics:', error);
        }
    }

    async loadRecentActivity() {
        try {
            const response = await fetch('/api/activity');
            const data = await response.json();
            
            if (data.success) {
                this.updateActivityDisplay(data.activity);
            }
        } catch (error) {
            console.error('Error loading activity:', error);
        }
    }

    updateProviderCards(providers) {
        Object.entries(providers).forEach(([providerId, data]) => {
            const card = document.querySelector(`[data-provider="${providerId}"]`);
            if (!card) return;

            const statusIndicator = card.querySelector('.status-indicator');
            const statusText = card.querySelector('.status-text');
            const toggleBtn = card.querySelector('.btn-toggle');

            // Update status indicator
            statusIndicator.className = 'status-indicator';
            statusIndicator.classList.add(data.status);

            // Update status text
            statusText.textContent = this.formatStatus(data.status);

            // Update card class
            card.className = 'provider-card';
            card.classList.add(data.status);

            // Update toggle button
            toggleBtn.classList.toggle('active', data.enabled);
            toggleBtn.innerHTML = '<i class="fas fa-power-off"></i>';

            // Update provider details
            this.updateProviderDetails(card, data);
        });
    }

    updateProviderDetails(card, data) {
        const detailsContainer = card.querySelector('.provider-details');
        if (!detailsContainer) return;

        // Update specific values
        const responseTimeEl = card.querySelector(`#${card.dataset.provider}ResponseTime`);
        if (responseTimeEl) {
            responseTimeEl.textContent = data.responseTime ? `${data.responseTime}ms` : '- ms';
        }
    }

    updateModelsDisplay(models) {
        const container = document.getElementById('modelsContainer');
        if (!container) return;

        const costMode = document.getElementById('costMode')?.value || 'free';
        const filteredModels = this.filterModels(models, costMode);

        container.innerHTML = filteredModels.map(model => `
            <div class="model-card ${model.id === this.selectedModel ? 'selected' : ''}" 
                 data-model="${model.id}" 
                 data-provider="${model.provider}">
                <h4>${model.name}</h4>
                <div class="model-provider">${model.provider.toUpperCase()}</div>
                <div class="model-info">
                    <span class="model-badge ${model.cost === 'free' ? 'free' : 'premium'}">
                        ${model.cost === 'free' ? 'Free' : model.cost}
                    </span>
                </div>
            </div>
        `).join('');
    }

    filterModels(models, costMode) {
        if (costMode === 'all') return models;
        if (costMode === 'free') return models.filter(m => m.cost === 'free');
        if (costMode === 'premium') return models.filter(m => m.cost !== 'free');
        return models;
    }

    filterModelsByCost(costMode) {
        const models = Array.from(document.querySelectorAll('.model-card'));
        
        models.forEach(card => {
            const badge = card.querySelector('.model-badge');
            const isFree = badge.classList.contains('free');
            
            let show = false;
            if (costMode === 'all') show = true;
            else if (costMode === 'free') show = isFree;
            else if (costMode === 'premium') show = !isFree;
            
            card.style.display = show ? 'block' : 'none';
        });
    }

    updateMetricsDisplay(metrics) {
        this.metrics = { ...this.metrics, ...metrics };
        
        // Update overview metrics
        const currentProviderEl = document.getElementById('currentProvider');
        const currentModelEl = document.getElementById('currentModel');
        const requestCountEl = document.getElementById('requestCount');
        const estimatedCostEl = document.getElementById('estimatedCost');

        if (currentProviderEl) {
            currentProviderEl.textContent = this.currentProvider.toUpperCase();
        }
        
        if (currentModelEl) {
            currentModelEl.textContent = this.selectedModel || 'No seleccionado';
        }
        
        if (requestCountEl) {
            requestCountEl.textContent = this.metrics.totalRequests;
        }
        
        if (estimatedCostEl) {
            estimatedCostEl.textContent = metrics.costToday || '$0.00';
        }

        // Update performance metrics
        const avgResponseTimeEl = document.getElementById('avgResponseTime');
        const successRateEl = document.getElementById('successRate');
        
        if (avgResponseTimeEl) {
            avgResponseTimeEl.textContent = `${this.metrics.averageResponseTime}ms`;
        }
        
        if (successRateEl) {
            const rate = this.metrics.totalRequests > 0 
                ? ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(1)
                : 100;
            successRateEl.textContent = `${rate}%`;
        }
    }

    updateActivityDisplay(activity) {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        this.activityLog = activity;
        
        if (activity.length === 0) {
            container.innerHTML = '<div class="activity-item"><span class="activity-description">No recent activity</span></div>';
            return;
        }
        
        container.innerHTML = activity.slice(0, 10).map(item => `
            <div class="activity-item">
                <span class="activity-description">${item.description}</span>
                <span class="activity-time">${this.formatTime(item.timestamp)}</span>
            </div>
        `).join('');
    }

    async toggleProvider(providerId) {
        this.showLoading(`Toggling ${providerId} provider...`);
        
        try {
            const response = await fetch(`/api/providers/${providerId}/toggle`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast(`${providerId} provider ${data.enabled ? 'enabled' : 'disabled'}`, 'success');
                await this.loadProviderStatus();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            this.showToast(`Failed to toggle ${providerId} provider`, 'error');
            console.error('Error toggling provider:', error);
        } finally {
            this.hideLoading();
        }
    }

    async selectModel(modelId, provider) {
        this.showLoading('Switching model...');
        
        try {
            const response = await fetch('/api/model/select', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ modelId, provider })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.selectedModel = modelId;
                this.currentProvider = provider;
                
                // Update UI
                document.querySelectorAll('.model-card').forEach(card => {
                    card.classList.remove('selected');
                });
                document.querySelector(`[data-model="${modelId}"]`)?.classList.add('selected');
                
                // Update overview display
                this.updateMetricsDisplay(this.metrics);
                
                this.showToast(`Switched to ${modelId}`, 'success');
                this.log(`Model switched to ${modelId} (${provider})`);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            this.showToast('Failed to switch model', 'error');
            console.error('Error selecting model:', error);
        } finally {
            this.hideLoading();
        }
    }

    async refreshStatus() {
        this.showLoading('Refreshing status...');
        
        try {
            await this.loadInitialData();
            this.showToast('Status refreshed', 'success');
        } catch (error) {
            this.showToast('Failed to refresh status', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async testConnection() {
        this.showLoading('Testing connections...');
        
        try {
            const response = await fetch('/api/test-connection', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('Connection test completed', 'success');
                await this.loadProviderStatus();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            this.showToast('Connection test failed', 'error');
            console.error('Error testing connection:', error);
        } finally {
            this.hideLoading();
        }
    }

    async testSelectedModel() {
        if (!this.selectedModel) {
            this.showToast('Please select a model first', 'warning');
            return;
        }

        this.showLoading('Testing selected model...');
        
        try {
            const response = await fetch('/api/test-connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    model: this.selectedModel,
                    provider: this.currentProvider 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast(`Model ${this.selectedModel} test successful`, 'success');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            this.showToast('Model test failed', 'error');
            console.error('Error testing model:', error);
        } finally {
            this.hideLoading();
        }
    }

    async saveModelConfiguration() {
        if (!this.selectedModel) {
            this.showToast('Please select a model first', 'warning');
            return;
        }

        this.showLoading('Saving configuration...');
        
        try {
            const config = {
                provider: this.currentProvider,
                model: this.selectedModel,
                timestamp: Date.now()
            };

            localStorage.setItem('mentorpro_config', JSON.stringify(config));
            this.showToast('Configuration saved successfully', 'success');
            this.log(`Configuration saved: ${this.selectedModel} (${this.currentProvider})`);
        } catch (error) {
            this.showToast('Failed to save configuration', 'error');
            console.error('Error saving configuration:', error);
        } finally {
            this.hideLoading();
        }
    }

    async resetConfiguration() {
        if (confirm('Are you sure you want to reset the configuration? This will clear all settings.')) {
            this.showLoading('Resetting configuration...');
            
            try {
                localStorage.removeItem('mentorpro_config');
                this.selectedModel = null;
                this.currentProvider = 'openai';
                
                // Reset UI
                document.querySelectorAll('.model-card').forEach(card => {
                    card.classList.remove('selected');
                });

                await this.loadInitialData();
                this.showToast('Configuration reset successfully', 'success');
                this.log('Configuration reset to defaults');
            } catch (error) {
                this.showToast('Failed to reset configuration', 'error');
                console.error('Error resetting configuration:', error);
            } finally {
                this.hideLoading();
            }
        }
    }

    clearLogs() {
        this.activityLog = [];
        document.getElementById('recentActivity').innerHTML = '<div class="activity-item"><span class="activity-description">No recent activity</span></div>';
        this.showToast('Logs cleared', 'success');
    }

    exportLogs() {
        const logs = this.activityLog.map(item => 
            `${new Date(item.timestamp).toISOString()}: ${item.description}`
        ).join('\n');
        
        const blob = new Blob([logs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `monitor-logs-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Logs exported', 'success');
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(async () => {
            try {
                await this.loadProviderStatus();
                await this.loadMetrics();
                await this.loadRecentActivity();
            } catch (error) {
                console.error('Auto-refresh error:', error);
            }
        }, 30000); // Refresh every 30 seconds
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    formatStatus(status) {
        const statusMap = {
            'online': 'Online',
            'offline': 'Offline',
            'warning': 'Warning',
            'error': 'Error'
        };
        return statusMap[status] || status;
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString();
    }

    log(message) {
        const logEntry = {
            description: message,
            timestamp: Date.now()
        };
        
        this.activityLog.unshift(logEntry);
        if (this.activityLog.length > 50) {
            this.activityLog = this.activityLog.slice(0, 50);
        }
        
        // Update display if container exists
        const container = document.getElementById('recentActivity');
        if (container) {
            this.updateActivityDisplay(this.activityLog);
        }
    }

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = document.querySelector('.loading-text');
        
        if (overlay && text) {
            text.textContent = message;
            overlay.classList.add('show');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    destroy() {
        this.stopAutoRefresh();
    }
}

// Initialize monitor interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.monitorInterface = new MonitorInterface();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.monitorInterface) {
        window.monitorInterface.destroy();
    }
});

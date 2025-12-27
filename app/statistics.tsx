import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import {
    Activity,
    AlertCircle,
    BarChart3,
    Briefcase,
    ChevronLeft,
    Clock,
    Download,
    MessageSquare,
    PhoneCall,
    PieChart,
    RefreshCw,
    TrendingDown,
    TrendingUp,
    UserPlus,
    Users
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { statisticsService } from '../services/api';

const { width } = Dimensions.get('window');

interface StatData {
    totalPersons: number;
    totalGroups: number;
    totalCalls: number;
    totalPosts: number;
    personsByMonth: { month: string; count: number }[];
    callsByMonth: { month: string; count: number }[];
    topOccupations: { occupation: string; count: number }[];
    ageDistribution: { range: string; count: number }[];
    recentActivity: { type: string; description: string; time: string }[];
    growthRate: number;
}

export default function StatisticsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statData, setStatData] = useState<StatData>({
        totalPersons: 0,
        totalGroups: 0,
        totalCalls: 0,
        totalPosts: 0,
        personsByMonth: [],
        callsByMonth: [],
        topOccupations: [],
        ageDistribution: [],
        recentActivity: [],
        growthRate: 0,
    });
    const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

    useEffect(() => {
        loadStatistics();
    }, [selectedPeriod]);

    const loadStatistics = async () => {
        try {
            setError(null);
            const userId = await AsyncStorage.getItem('userId');
            console.log('Loading statistics for user:', userId);

            if (!userId) {
                router.replace('/login');
                return;
            }

            console.log('Fetching statistics data...');

            const [overviewResponse, monthlyResponse, demographicsResponse] = await Promise.all([
                statisticsService.getOverview(userId).catch(err => {
                    console.error('Overview API error:', err.response?.data || err.message);
                    return { success: false, error: err.message };
                }),
                statisticsService.getMonthlyData(userId, selectedPeriod).catch(err => {
                    console.error('Monthly API error:', err.response?.data || err.message);
                    return { success: false, error: err.message };
                }),
                statisticsService.getDemographics(userId).catch(err => {
                    console.error('Demographics API error:', err.response?.data || err.message);
                    return { success: false, error: err.message };
                }),
            ]);

            console.log('API Responses:', {
                overview: overviewResponse,
                monthly: monthlyResponse,
                demographics: demographicsResponse
            });

            if (!overviewResponse.success || !monthlyResponse.success || !demographicsResponse.success) {
                const errorMessages = [];
                if (!overviewResponse.success) errorMessages.push(`Overview: ${overviewResponse.error || 'Unknown error'}`);
                if (!monthlyResponse.success) errorMessages.push(`Monthly: ${monthlyResponse.error || 'Unknown error'}`);
                if (!demographicsResponse.success) errorMessages.push(`Demographics: ${demographicsResponse.error || 'Unknown error'}`);

                setError(errorMessages.join('\n'));
                setStatData(getMockData());
                return;
            }

            setStatData({
                totalPersons: overviewResponse.totalPersons || 0,
                totalGroups: overviewResponse.totalGroups || 0,
                totalCalls: overviewResponse.totalCalls || 0,
                totalPosts: overviewResponse.totalPosts || 0,
                growthRate: overviewResponse.growthRate || 0,
                personsByMonth: monthlyResponse.personsByMonth || [],
                callsByMonth: monthlyResponse.callsByMonth || [],
                ageDistribution: demographicsResponse.ageDistribution || [],
                topOccupations: demographicsResponse.topOccupations || [],
                recentActivity: demographicsResponse.recentActivity || [],
            });

            console.log('Statistics loaded successfully');

        } catch (error: any) {
            console.error('Statistics load error:', error);
            setError(error.message || 'Failed to load statistics');

            // Set mock data for development
            setStatData(getMockData());
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getMockData = (): StatData => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        return {
            totalPersons: 25,
            totalGroups: 12,
            totalCalls: 48,
            totalPosts: 36,
            growthRate: 15,
            personsByMonth: months.map(month => ({
                month,
                count: Math.floor(Math.random() * 10) + 5
            })),
            callsByMonth: months.map(month => ({
                month,
                count: Math.floor(Math.random() * 15) + 3
            })),
            topOccupations: [
                { occupation: 'Software Developer', count: 8 },
                { occupation: 'Business Owner', count: 5 },
                { occupation: 'Student', count: 4 },
                { occupation: 'Teacher', count: 3 },
                { occupation: 'Engineer', count: 2 }
            ],
            ageDistribution: [
                { range: '18-25', count: 8 },
                { range: '26-35', count: 12 },
                { range: '36-45', count: 3 },
                { range: '46-55', count: 1 },
                { range: '56+', count: 1 }
            ],
            recentActivity: [
                { type: 'person_added', description: 'Added John Doe', time: 'Today' },
                { type: 'group_created', description: 'Created Marketing Team', time: 'Yesterday' },
                { type: 'person_added', description: 'Added Jane Smith', time: '2 days ago' }
            ]
        };
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadStatistics();
    };

    const handleExportData = () => {
        Alert.alert('Export Data', 'Export feature coming soon!');
    };

    const renderStatCard = (title: string, value: number, icon: any, color: string, subtitle?: string) => (
        <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
                {icon}
            </View>
            <Text style={styles.statValue}>{value.toLocaleString()}</Text>
            <Text style={styles.statTitle}>{title}</Text>
            {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
    );

    const renderProgressBar = (label: string, value: number, max: number, color: string) => {
        const percentage = max > 0 ? (value / max) * 100 : 0;

        return (
            <View style={styles.progressItem}>
                <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>{label}</Text>
                    <Text style={styles.progressValue}>{value} ({percentage.toFixed(0)}%)</Text>
                </View>
                <View style={styles.progressBarContainer}>
                    <View
                        style={[
                            styles.progressBar,
                            {
                                width: `${percentage}%`,
                                backgroundColor: color,
                            }
                        ]}
                    />
                </View>
            </View>
        );
    };

    const renderErrorView = () => (
        <View style={styles.errorContainer}>
            <AlertCircle size={48} color="#ef4444" />
            <Text style={styles.errorTitle}>Failed to Load Data</Text>
            <Text style={styles.errorText}>
                {error || 'Unable to connect to the server.'}
            </Text>
            <Text style={styles.errorHint}>
                Using mock data for demonstration
            </Text>
            <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRefresh}
                activeOpacity={0.7}
            >
                <RefreshCw size={16} color="white" />
                <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={styles.loadingText}>Loading statistics...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Statistics & Analytics</Text>
                    <Text style={styles.headerSubtitle}>Comprehensive data insights</Text>
                </View>
                <View style={styles.headerButtons}>
                    <TouchableOpacity
                        style={[styles.headerButton, styles.refreshButton]}
                        onPress={handleRefresh}
                        activeOpacity={0.7}
                        disabled={refreshing}
                    >
                        {refreshing ? (
                            <ActivityIndicator size={16} color="#8b5cf6" />
                        ) : (
                            <RefreshCw size={18} color="#8b5cf6" />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.headerButton, styles.exportButton]}
                        onPress={handleExportData}
                        activeOpacity={0.7}
                    >
                        <Download size={18} color="#8b5cf6" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {error && renderErrorView()}

                {/* Period Selector */}
                <View style={styles.periodSelector}>
                    {['week', 'month', 'year'].map((period) => (
                        <TouchableOpacity
                            key={period}
                            style={[
                                styles.periodButton,
                                selectedPeriod === period && styles.periodButtonActive
                            ]}
                            onPress={() => setSelectedPeriod(period as any)}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.periodButtonText,
                                selectedPeriod === period && styles.periodButtonTextActive
                            ]}>
                                {period.charAt(0).toUpperCase() + period.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Overview Stats */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                            <View style={[styles.sectionIcon, { backgroundColor: '#8b5cf620' }]}>
                                <BarChart3 size={20} color="#8b5cf6" />
                            </View>
                            <Text style={styles.sectionTitle}>Overview</Text>
                        </View>
                        <View style={styles.growthBadge}>
                            {statData.growthRate >= 0 ? (
                                <TrendingUp size={14} color="#10b981" />
                            ) : (
                                <TrendingDown size={14} color="#ef4444" />
                            )}
                            <Text style={[
                                styles.growthText,
                                { color: statData.growthRate >= 0 ? '#10b981' : '#ef4444' }
                            ]}>
                                {statData.growthRate >= 0 ? '+' : ''}{statData.growthRate}%
                            </Text>
                        </View>
                    </View>

                    <View style={styles.statsGrid}>
                        {renderStatCard(
                            'Total Persons',
                            statData.totalPersons,
                            <Users size={24} color="#3b82f6" />,
                            '#3b82f6',
                            'Active profiles'
                        )}
                        {renderStatCard(
                            'Total Groups',
                            statData.totalGroups,
                            <MessageSquare size={24} color="#10b981" />,
                            '#10b981',
                            'Facebook groups'
                        )}
                        {renderStatCard(
                            'Total Calls',
                            statData.totalCalls,
                            <PhoneCall size={24} color="#f59e0b" />,
                            '#f59e0b',
                            'Call history'
                        )}
                        {renderStatCard(
                            'Total Posts',
                            statData.totalPosts,
                            <Activity size={24} color="#8b5cf6" />,
                            '#8b5cf6',
                            'Group posts'
                        )}
                    </View>
                </View>

                {/* Age Distribution */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                            <View style={[styles.sectionIcon, { backgroundColor: '#10b98120' }]}>
                                <PieChart size={20} color="#10b981" />
                            </View>
                            <Text style={styles.sectionTitle}>Age Distribution</Text>
                        </View>
                    </View>

                    <View style={styles.progressContainer}>
                        {statData.ageDistribution && statData.ageDistribution.length > 0 ? (
                            statData.ageDistribution.map((item, index) => {
                                const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
                                const maxCount = Math.max(...statData.ageDistribution.map(a => a.count));

                                return (
                                    <View key={item.range}>
                                        {renderProgressBar(
                                            item.range,
                                            item.count,
                                            maxCount,
                                            colors[index % colors.length]
                                        )}
                                    </View>
                                );
                            })

                        ) : (
                            <Text style={styles.emptyText}>No age data available</Text>
                        )}
                    </View>
                </View>

                {/* Top Occupations */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                            <View style={[styles.sectionIcon, { backgroundColor: '#f59e0b20' }]}>
                                <Briefcase size={20} color="#f59e0b" />
                            </View>
                            <Text style={styles.sectionTitle}>Top Occupations</Text>
                        </View>
                    </View>

                    <View style={styles.listContainer}>
                        {statData.topOccupations && statData.topOccupations.length > 0 ? (
                            statData.topOccupations.map((item, index) => (
                                <View key={index} style={styles.listItem}>
                                    <View style={styles.listItemLeft}>
                                        <View style={[styles.listBullet, { backgroundColor: '#8b5cf6' }]}>
                                            <Text style={styles.listBulletText}>{index + 1}</Text>
                                        </View>
                                        <Text style={styles.listItemText}>{item.occupation || 'Unknown'}</Text>
                                    </View>
                                    <Text style={styles.listItemCount}>{item.count}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No occupation data available</Text>
                        )}
                    </View>
                </View>

                {/* Recent Activity */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                            <View style={[styles.sectionIcon, { backgroundColor: '#3b82f620' }]}>
                                <Clock size={20} color="#3b82f6" />
                            </View>
                            <Text style={styles.sectionTitle}>Recent Activity</Text>
                        </View>
                        {/* {statData.recentActivity && statData.recentActivity.length > 0 && (
                            <TouchableOpacity activeOpacity={0.7}>
                                <Text style={styles.seeAllText}>See All</Text>
                            </TouchableOpacity>
                        )} */}
                    </View>

                    <View style={styles.activityContainer}>
                        {statData.recentActivity && statData.recentActivity.length > 0 ? (
                            statData.recentActivity.map((activity, index) => (
                                <View key={index} style={styles.activityItem}>
                                    <View style={[
                                        styles.activityIcon,
                                        {
                                            backgroundColor: activity.type === 'person_added' ? '#10b98120' : '#8b5cf620'
                                        }
                                    ]}>
                                        {activity.type === 'person_added' ? (
                                            <UserPlus size={16} color="#10b981" />
                                        ) : (
                                            <MessageSquare size={16} color="#8b5cf6" />
                                        )}
                                    </View>
                                    <View style={styles.activityContent}>
                                        <Text style={styles.activityDescription}>{activity.description}</Text>
                                        <Text style={styles.activityTime}>{activity.time}</Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No recent activity</Text>
                        )}
                    </View>
                </View>

                {/* Monthly Trends */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleContainer}>
                            <View style={[styles.sectionIcon, { backgroundColor: '#ef444420' }]}>
                                <TrendingUp size={20} color="#ef4444" />
                            </View>
                            <Text style={styles.sectionTitle}>Monthly Trends</Text>
                        </View>
                    </View>

                    <View style={styles.trendContainer}>
                        {statData.personsByMonth && statData.personsByMonth.length > 0 ? (
                            <>
                                <View style={styles.trendLabels}>
                                    {statData.personsByMonth.map((item, index) => (
                                        <Text key={index} style={styles.trendLabel}>{item.month}</Text>
                                    ))}
                                </View>
                                <View style={styles.trendBars}>
                                    {statData.personsByMonth.map((item, index) => {
                                        const maxCount = Math.max(...statData.personsByMonth.map(p => p.count));
                                        const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

                                        return (
                                            <View key={index} style={styles.trendBarWrapper}>
                                                <View
                                                    style={[
                                                        styles.trendBar,
                                                        {
                                                            height: `${height}%`,
                                                            backgroundColor: index === statData.personsByMonth.length - 1 ? '#8b5cf6' : '#3b82f6'
                                                        }
                                                    ]}
                                                />
                                                <Text style={styles.trendValue}>{item.count}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </>
                        ) : (
                            <View style={styles.emptyTrendContainer}>
                                <Text style={styles.emptyText}>No trend data available</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.footerSpacer} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6b7280',
    },
    header: {
        backgroundColor: 'white',
        paddingTop: 20,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 5,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center',
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    refreshButton: {
        width: 36,
        height: 36,
    },
    exportButton: {
        width: 36,
        height: 36,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    errorContainer: {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
        borderWidth: 1,
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        alignItems: 'center',
    },
    errorTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#dc2626',
        marginTop: 12,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 14,
        color: '#7f1d1d',
        textAlign: 'center',
        marginBottom: 8,
    },
    errorHint: {
        fontSize: 12,
        color: '#b91c1c',
        fontStyle: 'italic',
        marginBottom: 16,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#dc2626',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        gap: 8,
    },
    retryButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    periodSelector: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    periodButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    periodButtonActive: {
        backgroundColor: '#8b5cf6',
    },
    periodButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    periodButtonTextActive: {
        color: 'white',
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#6b7280',
    },
    growthBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    growthText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -8,
    },
    statCard: {
        width: '45%',
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 4,
        marginBottom: 16,
        alignItems: 'center',
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    statTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 2,
        textAlign: 'center',
    },
    statSubtitle: {
        fontSize: 11,
        color: '#9ca3af',
        textAlign: 'center',
    },
    progressContainer: {
        gap: 12,
    },
    progressItem: {
        marginBottom: 8,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    progressLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#374151',
    },
    progressValue: {
        fontSize: 12,
        color: '#6b7280',
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    listContainer: {
        gap: 8,
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    listItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    listBullet: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listBulletText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    listItemText: {
        fontSize: 14,
        color: '#1f2937',
        fontWeight: '500',
        flexShrink: 1,
    },
    listItemCount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#8b5cf6',
        marginLeft: 8,
    },
    activityContainer: {
        gap: 12,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    activityIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityContent: {
        flex: 1,
    },
    activityDescription: {
        fontSize: 14,
        color: '#1f2937',
        marginBottom: 2,
    },
    activityTime: {
        fontSize: 12,
        color: '#9ca3af',
    },
    trendContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 16,
        height: 200,
        paddingTop: 20,
    },
    emptyTrendContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: 200,
    },
    trendLabels: {
        justifyContent: 'space-between',
        height: '100%',
        paddingBottom: 20,
    },
    trendLabel: {
        fontSize: 11,
        color: '#9ca3af',
        textAlign: 'center',
        height: 20,
    },
    trendBars: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: '100%',
    },
    trendBarWrapper: {
        alignItems: 'center',
        height: '100%',
        justifyContent: 'flex-end',
    },
    trendBar: {
        width: 20,
        borderRadius: 6,
        marginBottom: 8,
    },
    trendValue: {
        fontSize: 11,
        color: '#6b7280',
        fontWeight: '500',
    },
    seeAllText: {
        fontSize: 13,
        color: '#8b5cf6',
        fontWeight: '600',
    },
    emptyText: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        paddingVertical: 20,
        fontStyle: 'italic',
    },
    footerSpacer: {
        height: 40,
    },
});
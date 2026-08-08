import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

// ガシャポン設置場所の型定義
type LocationData = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  machine_count: number;
  open_time: string;
  close_time: string;
};



export default function MapScreen() {
  const now = Date.now();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [selectedImageReport, setSelectedImageReport] = useState<any | null>(null);
  const [storeReports, setStoreReports] = useState<any[]>([]);
  const [gashaponLocations, setGashaponLocations] = useState<LocationData[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<LocationData[] | null>(null);

  // BottomSheetとMapの参照と設定
  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapView>(null);

  // 現在地に戻る処理
  const goToMyLocation = useCallback(async () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }

    try {
      // 最新の現在地を取得して確実に移動する
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(currentLocation);
        
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }
      }
    } catch (error) {
      console.log('Error getting current location:', error);
    }
  }, [location]);
  const snapPoints = useMemo(() => ['30%', '70%'], []);

  const navigation = useNavigation();
  const router = useRouter();
  const { storeId, gachaponId } = useLocalSearchParams<{ storeId?: string, gachaponId?: string }>();

  // 検索画面から店舗が選ばれて戻ってきた際の処理
  useEffect(() => {
    if (storeId && gashaponLocations.length > 0) {
      const store = gashaponLocations.find((loc) => loc.id === storeId);
      if (store) {
        handleMarkerPress(store);
        mapRef.current?.animateToRegion({
          latitude: store.latitude,
          longitude: store.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    }
  }, [storeId, gashaponLocations]);

  // 検索画面からガシャポン商品が選ばれた際の絞り込み処理
  useEffect(() => {
    if (gachaponId && gashaponLocations.length > 0) {
      const fetchInStockStores = async () => {
        // 対象の商品の在庫報告がある店舗を取得
        const { data } = await supabase
          .from('reports')
          .select('store_id, stock_status')
          .eq('gachapon_id', gachaponId)
          .order('created_at', { ascending: false });

        if (data) {
          // 店舗ごとに最新のステータスを抽出
          const latestStatusByStore = new Map<string, number>();
          for (const report of data) {
            if (!latestStatusByStore.has(report.store_id)) {
              latestStatusByStore.set(report.store_id, report.stock_status);
            }
          }

          // ステータスが1（残りわずか）か2（在庫あり）の店舗IDを抽出
          const inStockStoreIds = new Set(
            Array.from(latestStatusByStore.entries())
              .filter(([_, status]) => status > 0)
              .map(([storeId, _]) => storeId)
          );

          // マップ上のピンを絞り込み
          const filtered = gashaponLocations.filter(loc => inStockStoreIds.has(loc.id));
          setFilteredLocations(filtered);

          // 絞り込まれたピンにカメラを合わせる
          if (filtered.length > 0) {
            const coordinates = filtered.map(loc => ({
              latitude: loc.latitude,
              longitude: loc.longitude,
            }));
            
            setTimeout(() => {
              mapRef.current?.fitToCoordinates(coordinates, {
                edgePadding: { top: 150, right: 50, bottom: 100, left: 50 },
                animated: true,
              });
            }, 500);
          }
        }
      };
      
      fetchInStockStores();
    } else if (!gachaponId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilteredLocations(null);
    }
  }, [gachaponId, gashaponLocations]);

  // フッターのMapタブを再度押した時の処理
  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('tabPress', (e: any) => {
      // 既にMap画面を開いている状態でMapタブが押されたら
      if (navigation.isFocused()) {
        bottomSheetRef.current?.close();
        setSelectedLocation(null);
        goToMyLocation();
      }
    });
    return unsubscribe;
  }, [navigation, location, goToMyLocation]);

  useFocusEffect(
    useCallback(() => {
      if (__DEV__) console.log('MapScreen: focused');
      return () => {
        if (__DEV__) console.log('MapScreen: blurred');
      };
    }, [])
  );

  useEffect(() => {
    const fetchStores = async () => {
      const { data } = await supabase.from('stores').select('*');
      if (data) {
        const locations = data.map((store: any) => {
          let lat = 0;
          let lng = 0;
          if (store.location) {
            // ユーザーのDB入力形式に合わせる: "(lat,lng)"
            const match = store.location.match(/\(([^,]+),([^)]+)\)/);
            if (match) {
              lat = parseFloat(match[1]);
              lng = parseFloat(match[2]);
            }
          }
          return {
            id: store.id,
            title: store.name || '不明な店舗',
            latitude: lat,
            longitude: lng,
            machine_count: store.machine_count || 0,
            open_time: store.open_time ? store.open_time.slice(0, 5) : '--:--',
            close_time: store.close_time ? store.close_time.slice(0, 5) : '--:--',
          };
        }).filter((loc: LocationData) => loc.latitude !== 0 && loc.longitude !== 0);

        setGashaponLocations(locations);
      }
    };
    fetchStores();

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []);

  // 選択された店舗のレポートを取得
  useEffect(() => {
    if (selectedLocation) {
      const fetchReports = async () => {
        const { data, error } = await supabase
          .from('reports')
          .select(`
            id,
            created_at,
            stock_status,
            photo_url,
            gachapons ( name ),
            profiles ( id, nickname, icon_image )
          `)
          .eq('store_id', selectedLocation.id)
          .order('created_at', { ascending: false })
          .limit(11); // 10件以上あるか判定するために11件取得
          
        if (data) {
          setStoreReports(data);
        } else if (error) {
          console.error('Error fetching reports:', error);
        }
      };
      fetchReports();
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStoreReports([]);
    }
  }, [selectedLocation]);

  // マーカータップ時の処理
  function handleMarkerPress(loc: LocationData) {
    setSelectedLocation(loc);
    bottomSheetRef.current?.expand(); // シートを引き出す
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        showsMyLocationButton={false} // カスタムボタンを使うためデフォルトを非表示
        initialRegion={
          location
            ? {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }
            : {
              latitude: 35.1709, // 名古屋 栄
              longitude: 136.9082,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }
        }
        onPress={() => {
          // マップの何もない場所をタップしたらシートを閉じる
          bottomSheetRef.current?.close();
        }}
      >
        {(filteredLocations || gashaponLocations).map((loc) => (
          <Marker
            key={loc.id}
            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
            pinColor="brown"
            onPress={(e) => {
              e.stopPropagation();
              handleMarkerPress(loc);
            }}
          >
            <Callout tooltip>
              <View style={styles.customCalloutContainer}>
                <View style={styles.customCallout}>
                  <Text style={styles.calloutTitle} numberOfLines={2}>
                    {loc.title}
                  </Text>
                  <View style={styles.calloutDetails}>
                    <Ionicons name="apps-outline" size={14} color="#666" />
                    <Text style={styles.calloutText}>{loc.machine_count}台</Text>
                    <Ionicons name="time-outline" size={14} color="#666" style={{ marginLeft: 8 }} />
                    <Text style={styles.calloutText}>{loc.open_time}〜{loc.close_time}</Text>
                  </View>
                </View>
                <View style={styles.calloutArrow} />
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* フローティング検索バー */}
      <TouchableOpacity 
        style={styles.searchContainer}
        activeOpacity={0.8}
        onPress={() => router.push('/search')}
      >
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <View style={styles.searchInput} pointerEvents="none">
          <Text style={{ color: '#999', fontSize: 16 }}>店舗名、場所で検索...</Text>
        </View>
      </TouchableOpacity>

      {/* 現在地に戻るボタン */}
      {!selectedLocation && (
        <TouchableOpacity style={styles.myLocationButton} onPress={goToMyLocation}>
          <Ionicons name="navigate" size={24} color="#007AFF" />
        </TouchableOpacity>
      )}

      {/* 店舗詳細・在庫カードボトムシート */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1} // 初期状態は非表示
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        onClose={() => setSelectedLocation(null)}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
          {selectedLocation && (
            <>
              {/* 店舗ヘッダー */}
              <View style={styles.shopHeader}>
                <Text style={styles.shopTitle}>{selectedLocation.title}</Text>
                <View style={styles.shopMetaRow}>
                  <Text style={styles.shopMetaBadge}>台数: {selectedLocation.machine_count}台</Text>
                  <View style={styles.timeInfo}>
                    <Ionicons name="time-outline" size={14} color="#666" />
                    <Text style={styles.shopMetaText}>営業中: {selectedLocation.close_time}まで</Text>
                  </View>
                </View>
              </View>

              {/* 最新レポートハイライト */}
              {storeReports.length > 0 && (() => {
                const latestReport = storeReports[0];
                const diff = now - new Date(latestReport.created_at).getTime();
                const seconds = Math.floor(diff / 1000);
                let timeAgo = '';
                if (seconds < 60) {
                  timeAgo = `${seconds}秒前`;
                } else {
                  const minutes = Math.floor(seconds / 60);
                  if (minutes < 60) timeAgo = `${minutes}分前`;
                  else {
                    const hours = Math.floor(minutes / 60);
                    timeAgo = hours < 24 ? `${hours}時間前` : `${Math.floor(hours / 24)}日前`;
                  }
                }
                
                let statusText = '不明';
                if (latestReport.stock_status === 2) statusText = '在庫あり';
                else if (latestReport.stock_status === 1) statusText = '残りわずか';
                else if (latestReport.stock_status === 0) statusText = '売り切れ';

                return (
                  <View style={styles.highlightCard}>
                    <View style={styles.highlightHeader}>
                      <View style={styles.redDot} />
                      <Text style={styles.highlightTitle}>【最新レポート】{timeAgo}</Text>
                    </View>
                    <Text style={styles.highlightItemName}>{latestReport.gachapons?.name || '不明な商品'} {statusText}</Text>
                    <View style={styles.highlightUserRow}>
                      {latestReport.profiles?.icon_image && latestReport.profiles.icon_image.startsWith('http') ? (
                        <Image source={{ uri: latestReport.profiles.icon_image }} style={{ width: 16, height: 16, borderRadius: 8 }} />
                      ) : (
                        <Ionicons name="person-circle" size={16} color="#666" />
                      )}
                      <Text style={[styles.highlightUserText, { fontWeight: 'bold' }]}>{latestReport.profiles?.nickname || '名無しさん'}</Text>
                      <Text style={[styles.highlightUserText, { marginLeft: 0 }]}> が{timeAgo}に投稿しました！</Text>
                    </View>

                    {/* 画像エリア */}
                    <View style={styles.placeholderRow}>
                      {storeReports.slice(0, 3).map((report, index) => {
                        const isLastAndMore = index === 2 && storeReports.length > 3;
                        return (
                          <TouchableOpacity 
                            key={report.id} 
                            style={styles.placeholderBoxSmall}
                            activeOpacity={0.8}
                            onPress={() => {
                              if (isLastAndMore) {
                                router.push('/post');
                              } else {
                                setSelectedImageReport(report);
                              }
                            }}
                          >
                            {report.photo_url ? (
                              <Image source={{ uri: report.photo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            ) : (
                              <Ionicons name="image-outline" size={24} color="#ccc" />
                            )}
                            
                            {/* 3枚目かつ4枚以上ある場合のオーバーレイ */}
                            {isLastAndMore && (
                              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }]}>
                                <Text style={styles.placeholderMore}>+{storeReports.length > 10 ? '7+' : storeReports.length - 3}</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* ナビ開始ボタン */}
                    <TouchableOpacity style={styles.routeButton}>
                      <Ionicons name="map-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.routeButtonText}>ルート・ナビ開始</Text>
                    </TouchableOpacity>
                  </View>
                );
              })()}

              {/* 在庫投稿履歴ヘッダー */}
              <View style={styles.historyHeaderRow}>
                <Text style={styles.historyTitle}>在庫投稿履歴 <Text style={styles.historyCount}>({storeReports.length > 10 ? '10+' : storeReports.length}件)</Text></Text>
                {storeReports.length > 10 && (
                  <TouchableOpacity onPress={() => router.push('/post')}>
                    <Text style={styles.seeAllText}>すべて見る</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* 在庫カードリスト */}
              {storeReports.slice(0, 10).map((report) => {
                const title = report.gachapons?.name || '不明な商品';
                
                // 経過時間の計算
                const diff = now - new Date(report.created_at).getTime();
                const minutes = Math.floor(diff / 60000);
                let timeAgo = `${minutes}分前`;
                if (minutes >= 60) {
                  const hours = Math.floor(minutes / 60);
                  timeAgo = hours < 24 ? `${hours}時間前` : `${Math.floor(hours / 24)}日前`;
                }
                
                // ステータスのフォーマット
                let statusInfo = { text: '不明', color: '#8E8E93', bgColor: '#F2F2F7' };
                if (report.stock_status === 2) statusInfo = { text: '在庫あり', color: '#FF7A00', bgColor: '#FFF2E5' };
                else if (report.stock_status === 1) statusInfo = { text: '残りわずか', color: '#007AFF', bgColor: '#E5F1FF' };
                else if (report.stock_status === 0) statusInfo = { text: '売り切れ', color: '#8E8E93', bgColor: '#F2F2F7' };

                return (
                  <TouchableOpacity 
                    key={report.id} 
                    style={styles.inventoryCard}
                    activeOpacity={0.7}
                    onPress={() => setSelectedImageReport(report)}
                  >
                    {/* 投稿画像プレースホルダー */}
                    <View style={styles.inventoryImagePlaceholder}>
                      {report.photo_url ? (
                        <Image source={{ uri: report.photo_url }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                      ) : (
                        <Ionicons name="image-outline" size={32} color="#ccc" />
                      )}
                    </View>

                    {/* 詳細情報 */}
                    <View style={styles.inventoryDetails}>
                      <Text style={styles.inventoryItemTitle}>{title}</Text>
                      
                      {/* ユーザー情報 */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
                        {report.profiles?.icon_image && report.profiles.icon_image.startsWith('http') ? (
                          <Image source={{ uri: report.profiles.icon_image }} style={{ width: 16, height: 16, borderRadius: 8 }} />
                        ) : (
                          <Ionicons name="person-circle" size={16} color="#aaa" />
                        )}
                        <Text style={{ fontSize: 12, color: '#666', fontWeight: 'bold', marginLeft: 4 }}>
                          {report.profiles?.nickname || '名無しさん'}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#aaa', marginLeft: 4 }}>
                          @{report.profiles?.id ? report.profiles.id.substring(0, 8) : 'unknown'}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Text style={styles.inventoryTimeAgo}>{timeAgo}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor, marginLeft: 8 }]}>
                          <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* 下部の余白 (フッターに隠れないように大きめに確保) */}
              <View style={{ height: 120 }} />
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* 投稿詳細モーダル */}
      <Modal
        visible={!!selectedImageReport}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedImageReport(null)}
      >
        <View style={styles.modalOverlay}>
          {/* 背景タップで閉じる */}
          <TouchableOpacity 
            style={styles.modalCloseArea} 
            activeOpacity={1} 
            onPress={() => setSelectedImageReport(null)}
          />
          <View style={styles.modalContent}>
            {/* 閉じるボタン */}
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setSelectedImageReport(null)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            
            {/* 画像 */}
            {selectedImageReport?.photo_url ? (
              <Image 
                source={{ uri: selectedImageReport.photo_url }} 
                style={styles.modalImage} 
                resizeMode="contain" 
              />
            ) : (
              <View style={[styles.modalImage, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="image-outline" size={64} color="#666" />
              </View>
            )}

            {/* 詳細情報 */}
            <View style={styles.modalInfoBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                {selectedImageReport?.profiles?.icon_image && selectedImageReport.profiles.icon_image.startsWith('http') ? (
                  <Image source={{ uri: selectedImageReport.profiles.icon_image }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                ) : (
                  <Ionicons name="person-circle" size={40} color="#ccc" style={{ marginLeft: -2 }} />
                )}
                <View style={{ marginLeft: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>
                    {selectedImageReport?.profiles?.nickname || '名無しさん'}
                  </Text>
                  <Text style={{ color: '#aaa', fontSize: 12 }}>
                    @{selectedImageReport?.profiles?.id ? selectedImageReport.profiles.id.substring(0, 8) : 'unknown'}
                  </Text>
                </View>
              </View>

              <Text style={styles.modalItemName}>{selectedImageReport?.gachapons?.name || '不明な商品'}</Text>
              
              <View style={styles.modalStatusRow}>
                <View style={[styles.statusBadge, { 
                  backgroundColor: selectedImageReport?.stock_status === 2 ? '#FFF2E5' : 
                                 selectedImageReport?.stock_status === 1 ? '#E5F1FF' : '#F2F2F7' 
                }]}>
                  <Text style={[styles.statusBadgeText, { 
                    color: selectedImageReport?.stock_status === 2 ? '#FF7A00' : 
                           selectedImageReport?.stock_status === 1 ? '#007AFF' : '#8E8E93' 
                  }]}>
                    {selectedImageReport?.stock_status === 2 ? '在庫あり' : 
                     selectedImageReport?.stock_status === 1 ? '残りわずか' : '売り切れ'}
                  </Text>
                </View>
                
                <Text style={styles.modalTimeText}>
                  {selectedImageReport?.created_at ? (() => {
                    const diff = now - new Date(selectedImageReport.created_at).getTime();
                    const seconds = Math.floor(diff / 1000);
                    if (seconds < 60) return `${seconds}秒前`;
                    const minutes = Math.floor(seconds / 60);
                    if (minutes < 60) return `${minutes}分前`;
                    const hours = Math.floor(minutes / 60);
                    return hours < 24 ? `${hours}時間前` : `${Math.floor(hours / 24)}日前`;
                  })() : ''}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: width,
    height: height,
  },
  searchContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  micIcon: {
    marginLeft: 10,
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 150, // タブバー等に隠れないように少し高めに設定
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    zIndex: 999,
  },

  // ボトムシート関連
  bottomSheetBackground: {
    backgroundColor: '#F5F5F5', // 背景色を少しグレーに
    borderRadius: 24,
  },
  handleIndicator: {
    width: 40,
    backgroundColor: '#DDDDDD',
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  // 店舗ヘッダー
  shopHeader: {
    marginBottom: 20,
  },
  shopTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 30,
    marginBottom: 8,
  },
  shopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopMetaBadge: {
    backgroundColor: '#FFEFE5',
    color: '#D95C14',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 12,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopMetaText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },

  // 最新レポートハイライト
  highlightCard: {
    backgroundColor: '#FFF5E5', // 薄いオレンジ背景
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E53935',
    marginRight: 6,
  },
  highlightTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D95C14',
  },
  highlightItemName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  highlightUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  highlightUserText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  placeholderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  placeholderBoxSmall: {
    flex: 1,
    height: 80,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  placeholderMore: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  routeButton: {
    backgroundColor: '#C62828',
    borderRadius: 25,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // 在庫投稿履歴ヘッダー
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  historyCount: {
    color: '#D95C14',
  },
  seeAllText: {
    fontSize: 14,
    color: '#D95C14',
    fontWeight: '600',
  },

  // 在庫カード
  inventoryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inventoryImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  inventoryDetails: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  inventoryItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  inventoryTimeAgo: {
    fontSize: 13,
    color: '#888',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // カスタムコールアウト(ピンの吹き出し)
  customCalloutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  customCallout: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  calloutDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calloutText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  calloutArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'white',
    transform: [{ rotate: '180deg' }],
    marginTop: -1, // 吹き出し本体との隙間を埋めるため
  },
  
  // モーダル関連
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContent: {
    width: '100%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  modalImage: {
    width: width,
    height: width, // 正方形で大きく表示
  },
  modalInfoBox: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    padding: 16,
    borderRadius: 16,
  },
  modalItemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTimeText: {
    color: '#aaa',
    fontSize: 12,
    marginLeft: 12,
  },
});

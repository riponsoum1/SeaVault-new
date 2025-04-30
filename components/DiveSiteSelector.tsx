import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MapPin, Search, X, Plus } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DiveSite {
  id: string;
  name: string;
  location: string;
  type?: string;
}

interface DiveSiteSelectorProps {
  selectedDiveSite: DiveSite | null;
  onSelectDiveSite: (site: DiveSite) => void;
  customFetchFunction?: () => Promise<DiveSite[]>;
}

const { height } = Dimensions.get('window');

export default function DiveSiteSelector({
  selectedDiveSite,
  onSelectDiveSite,
  customFetchFunction,
}: DiveSiteSelectorProps) {
  const [showDiveSiteModal, setShowDiveSiteModal] = useState(false);
  const [diveSites, setDiveSites] = useState<DiveSite[]>([]);
  const [filteredDiveSites, setFilteredDiveSites] = useState<DiveSite[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // For custom dive site
  const [isCustomDiveSite, setIsCustomDiveSite] = useState(false);
  const [customDiveSiteName, setCustomDiveSiteName] = useState('');
  const [customDiveSiteLocation, setCustomDiveSiteLocation] = useState('');

  useEffect(() => {
    if (showDiveSiteModal && diveSites.length === 0) {
      fetchDiveSites();
    }
  }, [showDiveSiteModal]);

  const fetchDiveSites = async () => {
    try {
      setLoading(true);
      let sites: DiveSite[] = [];

      // Try using custom fetch function if provided
      if (customFetchFunction) {
        try {
          const customSites = await customFetchFunction();
          if (
            customSites &&
            Array.isArray(customSites) &&
            customSites.length > 0
          ) {
            sites = customSites;
            console.log(
              'Loaded dive sites from custom function:',
              sites.length
            );
          }
        } catch (customError) {
          console.error('Error in custom fetch function:', customError);
        }
      }

      // If no sites from custom function, try AsyncStorage
      if (sites.length === 0) {
        const storedDiveSites = await AsyncStorage.getItem('@dive_sites');
        if (storedDiveSites) {
          const parsedSites = JSON.parse(storedDiveSites);
          if (Array.isArray(parsedSites) && parsedSites.length > 0) {
            sites = parsedSites;
            console.log('Loaded dive sites from AsyncStorage:', sites.length);
          }
        }
      }

      // If still no sites, use defaults
      if (sites.length === 0) {
        sites = createDefaultDiveSites();
        console.log('Created default dive sites:', sites.length);
      }

      // Update state with sites
      setDiveSites(sites);
      setFilteredDiveSites(sites);
    } catch (error) {
      console.error('Error fetching dive sites:', error);
      const defaults = createDefaultDiveSites();
      setDiveSites(defaults);
      setFilteredDiveSites(defaults);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultDiveSites = () => {
    const defaultDiveSites = [
      {
        id: '1',
        name: 'Great Blue Hole',
        location: 'Lighthouse Reef Atoll, Belize',
        type: 'blue hole',
      },
      {
        id: '2',
        name: 'Barracuda Point',
        location: 'Sipadan Island, Malaysia',
        type: 'wall',
      },
      {
        id: '3',
        name: 'SS Thistlegorm',
        location: 'Red Sea, Egypt',
        type: 'wreck',
      },
      {
        id: '4',
        name: 'Blue Corner Wall',
        location: 'Palau, Micronesia',
        type: 'wall',
      },
      {
        id: '5',
        name: 'Manta Ray Night Dive',
        location: 'Kailua Kona, Hawaii',
        type: 'night',
      },
    ];

    // Save default sites to AsyncStorage
    AsyncStorage.setItem('@dive_sites', JSON.stringify(defaultDiveSites)).catch(
      (error) => console.error('Error saving default dive sites:', error)
    );

    return defaultDiveSites;
  };

  const handleSearch = (text: string) => {
    setSearchTerm(text);
    if (text) {
      const filtered = diveSites.filter(
        (site) =>
          site.name.toLowerCase().includes(text.toLowerCase()) ||
          site.location.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredDiveSites(filtered);
    } else {
      setFilteredDiveSites(diveSites);
    }
  };

  const selectDiveSite = (site: DiveSite) => {
    onSelectDiveSite(site);
    setShowDiveSiteModal(false);
    setIsCustomDiveSite(false);
  };

  const addCustomDiveSite = () => {
    if (!customDiveSiteName || !customDiveSiteLocation) {
      Alert.alert(
        'Please enter both name and location for the custom dive site'
      );
      return;
    }

    const newSite = {
      id: `custom-${Date.now()}`,
      name: customDiveSiteName,
      location: customDiveSiteLocation,
      type: 'custom',
    };

    // Add to current list and select it
    const updatedSites = [...diveSites, newSite];
    setDiveSites(updatedSites);
    setFilteredDiveSites(updatedSites);
    onSelectDiveSite(newSite);

    // Store for future use
    AsyncStorage.setItem('@dive_sites', JSON.stringify(updatedSites)).catch(
      (error) => console.error('Error saving custom dive site:', error)
    );

    // Clear form and close modal
    setCustomDiveSiteName('');
    setCustomDiveSiteLocation('');
    setIsCustomDiveSite(false);
    setShowDiveSiteModal(false);
  };

  const toggleCustomDiveSite = () => {
    setIsCustomDiveSite(!isCustomDiveSite);
    setSearchTerm('');
  };

  const closeModal = () => {
    setShowDiveSiteModal(false);
    setIsCustomDiveSite(false);
    setSearchTerm('');
  };

  return (
    <>
      <TouchableOpacity
        style={styles.siteSelector}
        onPress={() => setShowDiveSiteModal(true)}
        activeOpacity={0.7}
      >
        <MapPin size={20} color="#0077B6" style={styles.selectorIcon} />
        <Text style={styles.selectorText}>
          {selectedDiveSite ? selectedDiveSite.name : 'Select a dive site'}
        </Text>
      </TouchableOpacity>

      {/* Dive Site Selection Modal */}
      <Modal
        visible={showDiveSiteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <View style={styles.siteModalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Dive Site</Text>
                <TouchableOpacity
                  onPress={closeModal}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  style={styles.closeButton}
                >
                  <X size={22} color="white" />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Search size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search dive sites..."
                  value={searchTerm}
                  onChangeText={handleSearch}
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {searchTerm.length > 0 && (
                  <TouchableOpacity
                    onPress={() => handleSearch('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={18} color="#666" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Main Content Area */}
              <View style={styles.contentContainer}>
                {isCustomDiveSite ? (
                  /* Custom Dive Site Form */
                  <View style={styles.customSiteForm}>
                    <Text style={styles.customFormTitle}>
                      Add Custom Dive Site
                    </Text>
                    <Text style={styles.inputLabel}>Dive Site Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter dive site name"
                      value={customDiveSiteName}
                      onChangeText={setCustomDiveSiteName}
                      placeholderTextColor="#666"
                    />
                    <Text style={styles.inputLabel}>Location</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Bahamas, Caribbean"
                      value={customDiveSiteLocation}
                      onChangeText={setCustomDiveSiteLocation}
                      placeholderTextColor="#666"
                    />
                    <View style={styles.customFormButtons}>
                      <TouchableOpacity
                        style={[styles.customFormButton, styles.cancelButton]}
                        onPress={() => setIsCustomDiveSite(false)}
                      >
                        <Text style={styles.customButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.customFormButton, styles.addButton]}
                        onPress={addCustomDiveSite}
                      >
                        <Text style={styles.customButtonText}>Add Site</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* Dive Site List */
                  <View style={styles.listContainer}>
                    {loading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#0077B6" />
                        <Text style={styles.loadingText}>
                          Loading dive sites...
                        </Text>
                      </View>
                    ) : filteredDiveSites.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.noResultsText}>
                          No dive sites found matching your search
                        </Text>
                        <Text style={styles.noResultsSubtext}>
                          Try a different search term or add a custom dive site
                        </Text>
                      </View>
                    ) : (
                      <FlatList
                        data={filteredDiveSites}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.siteItem}
                            onPress={() => selectDiveSite(item)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.siteInfo}>
                              <Text style={styles.siteName}>{item.name}</Text>
                              <Text style={styles.siteLocation}>
                                {item.location}
                              </Text>
                              {item.type && (
                                <View style={styles.siteTypeTag}>
                                  <Text style={styles.siteTypeText}>
                                    {item.type}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        )}
                        style={styles.siteList}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={true}
                      />
                    )}

                    {/* Add Custom Dive Site Button */}
                    <TouchableOpacity
                      style={styles.addCustomButton}
                      onPress={toggleCustomDiveSite}
                      activeOpacity={0.8}
                    >
                      <Plus size={18} color="white" style={styles.addIcon} />
                      <Text style={styles.addCustomText}>
                        Add Custom Dive Site
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  siteSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  selectorIcon: {
    marginRight: 10,
  },
  selectorText: {
    color: '#CCC',
    flex: 1,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  siteModalContent: {
    backgroundColor: '#121212',
    height: '100%',
    paddingTop: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    marginVertical: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContainer: {
    flex: 1,
  },
  siteList: {
    flex: 1,
    marginBottom: 10,
  },
  listContent: {
    paddingVertical: 10,
  },
  siteItem: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#444',
  },
  siteInfo: {
    flex: 1,
  },
  siteName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  siteLocation: {
    fontSize: 14,
    color: '#AAAAAA',
    marginBottom: 8,
  },
  siteTypeTag: {
    backgroundColor: '#0077B6',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  siteTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  noResultsText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  noResultsSubtext: {
    color: '#AAA',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 10,
  },
  addCustomButton: {
    backgroundColor: '#0077B6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  addIcon: {
    marginRight: 8,
  },
  addCustomText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 15,
    color: 'white',
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  inputLabel: {
    color: 'white',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  customSiteForm: {
    flex: 1,
    paddingVertical: 10,
  },
  customFormTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  customFormButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  customFormButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#444444',
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#0077B6',
  },
  customButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

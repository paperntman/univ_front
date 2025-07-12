// 이 파일은 애플리케이션의 메인 로직을 담당하며, UI 초기화, 이벤트 핸들러 설정, API 호출 조정 등의 기능을 수행합니다.

// TypeScript가 L 전역 변수를 인식하도록 이 줄을 추가합니다 (전역 타입 파일에서 이미 처리되지 않은 경우).
declare var L: any;
declare var XLSX: any; // SheetJS


// 타입 임포트
import { AdmissionTypeFilterKey, UserNaesinGrades, UserSuneungGrades, ApiNaesinGrades, UserNaesinSubject, UserSuneungSubjectDetailScore, UserSuneungSubjectExplorerScore } from './types';

// 설정 및 상태 관리 임포트
import { API_BASE_URL } from './config'; // API_BASE_URL은 api.ts에서 사용, 여기서는 직접 사용 안 함
import {
    userAllGrades,
    selectedDepartment, setSelectedDepartment,
    currentAdmissionTypeFilter, setCurrentAdmissionTypeFilter,
    currentScoreDifferenceTolerance, setCurrentScoreDifferenceTolerance,
    currentSidebarData, lastOpenedUniversityId,
    map, markersLayerGroup,
    currentFilteredUniversities, setCurrentFilteredUniversities,
    naesinInputMode, simplifiedNaesinGrade // 간편 입력 모드 관련 상태 추가
} from './state';

// API 유틸리티 임포트
import { fetchAllSubjectLists, fetchFilteredUniversitiesApi } from './api';

// 지도 유틸리티 임포트
import { initMap, loadInitialMarkers, updateMarkers } from './mapUtils';

// 사이드바 유틸리티 임포트
import { initializeSidebarControls, openSidebar, closeSidebar, renderSidebarContent as renderSidebarContentUtil } from './sidebarUtils';

// 성적 모달 유틸리티 임포트
import { 
    initializeGradeModalDOM, openGradeModal, closeGradeModal, handleGradeModalTabClick,
    addNaesinSubjectRow, populateSuneungSubjectDropdowns,
    saveSuneungGradesToJsonFile, loadSuneungGradesFromJsonFile, // 이름 변경됨
    saveNaesinGradesToXlsFile, loadNaesinGradesFromXlsFile, // XLS용 함수 추가
    collectSuneungGradesFromForm,
    collectSimplifiedNaesinGradeFromForm // 간편 내신 점수 수집 함수 추가
} from './gradeModalUtils';

// UI 유틸리티 임포트
import { initializeUiUtilsDOM, showLoading } from './uiUtils';


// --- DOM 요소 ---
const navbarEl = document.getElementById('navbar') as HTMLElement;
const toggleNavbarButtonEl = document.getElementById('toggle-navbar-button') as HTMLButtonElement;

// 학과 검색 관련: 기존 input과 suggestions div는 제거되고, 새 모달 관련 요소들 추가
const openDepartmentSearchModalButtonEl = document.getElementById('open-department-select-modal-button') as HTMLButtonElement;
const departmentSelectModalEl = document.getElementById('department-select-modal') as HTMLDivElement;
const majorCategorySelectEl = document.getElementById('major-category-select') as HTMLSelectElement;
const mediumCategorySelectEl = document.getElementById('medium-category-select') as HTMLSelectElement;
const minorCategorySelectEl = document.getElementById('minor-category-select') as HTMLSelectElement;
const applyDepartmentSelectionButtonEl = document.getElementById('apply-department-selection-button') as HTMLButtonElement;
const closeDepartmentModalButtonEl = document.getElementById('close-department-modal-button') as HTMLButtonElement;


const enterGradesButtonEl = document.getElementById('enter-grades-button') as HTMLButtonElement; 
const admissionTypeFilterSelectEl = document.getElementById('admission-type-filter') as HTMLSelectElement; 
const scoreDifferenceToleranceInputEl = document.getElementById('score-difference-tolerance') as HTMLInputElement; 
const scoreDifferenceToleranceSliderEl = document.getElementById('score-difference-tolerance-slider') as HTMLInputElement; 
const detailedAdmissionFilterEl = document.getElementById('detailed-admission-filter') as HTMLInputElement; // 세부 전형 필터
const applyFiltersButtonEl = document.getElementById('apply-filters-button') as HTMLButtonElement; 

const mapDivEl = document.getElementById('map') as HTMLDivElement; 
const sidebarDivEl = document.getElementById('sidebar') as HTMLElement; 
const sidebarContentDivEl = document.getElementById('sidebar-content') as HTMLDivElement; 
const closeSidebarButtonEl = document.getElementById('close-sidebar-button') as HTMLButtonElement; 
const loadingOverlayEl = document.getElementById('loading-overlay') as HTMLDivElement; 

const gradeInputModalEl = document.getElementById('grade-input-modal') as HTMLDivElement; 
const closeGradeModalButtonEl = document.getElementById('close-grade-modal-button') as HTMLButtonElement; 

// JSON 버튼
const saveSuneungGradesJsonButtonEl = document.getElementById('save-suneung-grades-json-button') as HTMLButtonElement; 
const loadSuneungGradesJsonInputEl = document.getElementById('load-suneung-grades-json-input') as HTMLInputElement; 
const loadSuneungGradesJsonButtonEl = document.getElementById('load-suneung-grades-json-button') as HTMLButtonElement; 

// XLS 버튼
const saveNaesinGradesXlsButtonEl = document.getElementById('save-naesin-grades-xls-button') as HTMLButtonElement;
const loadNaesinGradesXlsInputEl = document.getElementById('load-naesin-grades-xls-input') as HTMLInputElement;
const loadNaesinGradesXlsButtonEl = document.getElementById('load-naesin-grades-xls-button') as HTMLButtonElement;

const modalTabsEl = gradeInputModalEl.querySelectorAll('.tab-button'); 
const modalTabContentsEl = gradeInputModalEl.querySelectorAll('.tab-content'); 
const submitGradesButtonEl = document.getElementById('submit-grades-button') as HTMLButtonElement; 

// 상세 내신 입력 관련
const naesinDetailedFormEl = document.getElementById('naesin-detailed-form') as HTMLDivElement;
const naesinSubjectRowTemplateEl = document.getElementById('naesin-subject-row-template') as HTMLTemplateElement; 
const naesinGradeFormDivsEls = { 
    y1s1: document.getElementById('naesin-y1s1-subjects') as HTMLDivElement,
    y1s2: document.getElementById('naesin-y1s2-subjects') as HTMLDivElement,
    y2s1: document.getElementById('naesin-y2s1-subjects') as HTMLDivElement,
    y2s2: document.getElementById('naesin-y2s2-subjects') as HTMLDivElement,
    y3s1: document.getElementById('naesin-y3s1-subjects') as HTMLDivElement,
    y3s2: document.getElementById('naesin-y3s2-subjects') as HTMLDivElement, 
};
// 간편 내신 입력 관련
const naesinSimplifiedFormEl = document.getElementById('naesin-simplified-form') as HTMLDivElement;
const naesinSimplifiedGradeInputEl = document.getElementById('naesin-simplified-grade-input') as HTMLInputElement;
const naesinModeRadiosEl = gradeInputModalEl.querySelectorAll('input[name="naesin-mode"]');


const suneungExamSelectorEl = document.getElementById('suneung-exam-selector') as HTMLSelectElement; 
const suneungKoreanChoiceEl = document.getElementById('suneung-korean-choice') as HTMLSelectElement; 
const suneungKoreanRawEl = document.getElementById('suneung-korean-raw') as HTMLInputElement; 
// const suneungKoreanCalculatedDivEl = document.getElementById('suneung-korean-calculated') as HTMLDivElement; // Removed
const suneungMathChoiceEl = document.getElementById('suneung-math-choice') as HTMLSelectElement; 
const suneungMathRawEl = document.getElementById('suneung-math-raw') as HTMLInputElement; 
// const suneungMathCalculatedDivEl = document.getElementById('suneung-math-calculated') as HTMLDivElement; // Removed
const suneungEnglishRawEl = document.getElementById('suneung-english-raw') as HTMLInputElement; 
// const suneungEnglishCalculatedDivEl = document.getElementById('suneung-english-calculated') as HTMLDivElement; // Removed
const suneungHistoryRawEl = document.getElementById('suneung-history-raw') as HTMLInputElement; 
// const suneungHistoryCalculatedDivEl = document.getElementById('suneung-history-calculated') as HTMLDivElement; // Removed
const suneungExplorer1SubjectEl = document.getElementById('suneung-explorer1-subject') as HTMLSelectElement; 
const suneungExplorer1RawEl = document.getElementById('suneung-explorer1-raw') as HTMLInputElement; 
// const suneungExplorer1CalculatedDivEl = document.getElementById('suneung-explorer1-calculated') as HTMLDivElement; // Removed
const suneungExplorer2SubjectEl = document.getElementById('suneung-explorer2-subject') as HTMLSelectElement; 
const suneungExplorer2RawEl = document.getElementById('suneung-explorer2-raw') as HTMLInputElement; 
// const suneungExplorer2CalculatedDivEl = document.getElementById('suneung-explorer2-calculated') as HTMLDivElement; // Removed


// --- 메인 애플리케이션 로직 및 이벤트 핸들러 ---

// POST /universities/filter API 명세에 맞게 내신 성적을 변환하는 함수
function transformNaesinGradesForApi(internalNaesin: UserNaesinGrades): ApiNaesinGrades {
    const apiNaesin: ApiNaesinGrades = {};
    for (const year of [1, 2, 3]) {
        for (const semester of [1, 2]) {
            if (year === 3 && semester === 2) continue;

            const yearKey = `year${year}` as keyof UserNaesinGrades; 
            const semesterKey = `semester${semester}` as keyof UserNaesinGrades['year1']; 
            
            const subjects: UserNaesinSubject[] = internalNaesin[yearKey][semesterKey].subjects;
            
            if (subjects.length > 0) {
                const apiSemesterKey = `${year}-${semester}`;
                apiNaesin[apiSemesterKey] = subjects.map(s => ({
                    // id: s.id, // API 전송 시 id는 필요 없음 (ApiNaesinSubjectPayload 타입에 의해 id 제외됨)
                    curriculumClassificationCode: s.curriculumClassificationCode, 
                    curriculumClassificationName: s.curriculumClassificationName, 
                    curriculumAreaCode: s.curriculumAreaCode, 
                    curriculumAreaName: s.curriculumAreaName, 
                    subjectCode: s.subjectCode || null, 
                    subjectName: s.subjectName, 
                    grade: s.grade,
                    credits: s.credits,
                    rawScore: s.rawScore,
                    subjectMean: s.subjectMean,
                    stdDev: s.stdDev,
                    studentCount: s.studentCount,
                    achievementLevel: s.achievementLevel,
                    distributionA: s.distributionA,
                    distributionB: s.distributionB,
                    distributionC: s.distributionC,
                }));
            }
        }
    }
    return apiNaesin;
}

interface ApiSuneungSubjectPayload {
    rawScore: number | null;
    selectedOption?: string | null; // 국어, 수학용
    subjectName?: string | null;    // 탐구 과목명 (API가 과목 코드가 아닌 이름으로 식별할 경우)
    // subjectCode?: string | null; // 또는 subjectCode (API가 코드로 식별할 경우)
}

interface ApiSuneungGradesPayload {
    examIdentifierForCutInfo: string;
    subjects: {
        korean?: ApiSuneungSubjectPayload;
        math?: ApiSuneungSubjectPayload;
        english?: ApiSuneungSubjectPayload;
        history?: ApiSuneungSubjectPayload;
        explorer1?: ApiSuneungSubjectPayload;
        explorer2?: ApiSuneungSubjectPayload;
    };
}

function transformSuneungGradesForApi(suneungGrades: UserSuneungGrades): ApiSuneungGradesPayload {
    const payloadSubjects: Partial<ApiSuneungGradesPayload['subjects']> = {};

    const processSubject = (
        subjectData: UserSuneungSubjectDetailScore | UserSuneungSubjectExplorerScore | undefined,
        isExplorer: boolean = false
    ): ApiSuneungSubjectPayload | undefined => {
        if (!subjectData || subjectData.rawScore === null || subjectData.rawScore === undefined) {
            return undefined; 
        }
        
        const basePayload: ApiSuneungSubjectPayload = { rawScore: subjectData.rawScore };
        
        if (subjectData.selectedOption) { 
            basePayload.selectedOption = subjectData.selectedOption;
        }
        
        if (isExplorer) { 
            const explorerData = subjectData as UserSuneungSubjectExplorerScore;
            basePayload.subjectName = explorerData.subjectName; 
        }
        return basePayload;
    };

    payloadSubjects.korean = processSubject(suneungGrades.subjects.korean);
    payloadSubjects.math = processSubject(suneungGrades.subjects.math);
    payloadSubjects.english = processSubject(suneungGrades.subjects.english);
    payloadSubjects.history = processSubject(suneungGrades.subjects.history);
    payloadSubjects.explorer1 = processSubject(suneungGrades.subjects.explorer1, true);
    payloadSubjects.explorer2 = processSubject(suneungGrades.subjects.explorer2, true);
    
    const finalPayloadSubjects: any = {};
    for (const key in payloadSubjects) {
        if (payloadSubjects[key as keyof typeof payloadSubjects] !== undefined) {
            finalPayloadSubjects[key] = payloadSubjects[key as keyof typeof payloadSubjects];
        }
    }

    return {
        examIdentifierForCutInfo: suneungGrades.examIdentifierForCutInfo,
        subjects: finalPayloadSubjects as ApiSuneungGradesPayload['subjects']
    };
}


async function handleFilterUpdate() {
    if (!selectedDepartment) {
        alert('학과를 먼저 선택해주세요.');
        setCurrentFilteredUniversities([]);
        updateMarkers();
        return;
    }
    let naesinPayloadForApi: ApiNaesinGrades = {};
    let suneungPayloadForApi: ApiSuneungGradesPayload = { examIdentifierForCutInfo: '', subjects: {} };
    if (currentAdmissionTypeFilter !== '경쟁률') {
        collectSuneungGradesFromForm();

        // 내신 입력 모드에 따라 페이로드 생성
        if (naesinInputMode === 'simplified') {
            if (simplifiedNaesinGrade === null) {
                alert('간편 내신 평균 등급을 입력해주세요.');
                return;
            }
            // 사용자 요청에 따른 더미 내신 데이터 생성
            naesinPayloadForApi = {
                "1-1": [{
                    curriculumClassificationCode: "CLASS_COMMON_SELECT",
                    curriculumClassificationName: "일반선택",
                    curriculumAreaCode: "CURR_COMMON_KOR_SELECT",
                    curriculumAreaName: "국어",
                    subjectCode: "NAESIN_국어Ⅰ",
                    subjectName: "국어Ⅰ",
                    grade: 1, // API 요청용 더미 등급 (서버에서 환산점수 계산에 사용)
                    credits: 1,
                    rawScore: null, subjectMean: null, stdDev: null, studentCount: null, achievementLevel: null,
                    distributionA: null, distributionB: null, distributionC: null
                }]
            };
        } else { // 'detailed' mode
             naesinPayloadForApi = transformNaesinGradesForApi(userAllGrades.naesin);
        }

        const suneungHasInput = Object.values(userAllGrades.suneung.subjects || {}).some(v => v && (v.rawScore !== null && v.rawScore !== undefined));
        if (currentAdmissionTypeFilter === '수능' && !suneungHasInput) {
            setCurrentFilteredUniversities([]);
            updateMarkers();
            return;
        }
        if (suneungHasInput) {
            suneungPayloadForApi = transformSuneungGradesForApi(userAllGrades.suneung);
        } else {
            suneungPayloadForApi = { examIdentifierForCutInfo: '', subjects: {} };
        }
    }
    try {
        const requestPayload = {
            userGrades: {
                naesin: naesinPayloadForApi,
                suneung: suneungPayloadForApi
            },
            filterCriteria: {
                departmentKeywords: selectedDepartment,
                admissionType: currentAdmissionTypeFilter,
                scoreDifferenceTolerance: 8 // 항상 8(최대값)으로 고정하여 API 요청
            }
        };
        console.log('Sending to /universities/filter:', JSON.stringify(requestPayload, null, 2));
        let responseData = await fetchFilteredUniversitiesApi(requestPayload);

        // Client-side filtering based on detailed admission filter
        const detailedFilterValue = detailedAdmissionFilterEl.value.trim();
        if (detailedFilterValue && responseData) {
            const keywords = detailedFilterValue.split(' ').filter(k => k.trim() !== '');
            if (keywords.length > 0) {
                responseData = responseData.filter(uni => {
                    // The field for detailed admission type name is `detailAdmissionType` in the `FilteredUniversity` type
                    if (!uni.detailAdmissionType) return false;
                    
                    // Check if uni.detailAdmissionType contains ALL keywords
                    return keywords.every(keyword => uni.detailAdmissionType.includes(keyword));
                });
            }
        }

        // 간편 입력 모드일 경우, API 응답의 userCalculatedScore를 사용자가 입력한 값으로 덮어쓰기
        if (naesinInputMode === 'simplified' && simplifiedNaesinGrade !== null && responseData) {
            responseData = responseData.map(uni => {
                const updatedUni = { ...uni };
                const typesToUpdate: (keyof typeof updatedUni.admissionTypeResults)[] = ['gyogwa', 'jonghap'];
                
                typesToUpdate.forEach(type => {
                    if (updatedUni.admissionTypeResults[type]) {
                        // userCalculatedScore를 사용자가 입력한 간편 점수로 덮어씌운다.
                         updatedUni.admissionTypeResults[type]!.userCalculatedScore = simplifiedNaesinGrade!;
                    }
                });
                return updatedUni;
            });
            console.log("Overwrote userCalculatedScore with simplified grade:", simplifiedNaesinGrade);
        }


        if(responseData && Array.isArray(responseData)) {
            setCurrentFilteredUniversities(responseData);
        } else {
            setCurrentFilteredUniversities([]);
        }
        updateMarkers();
        if (lastOpenedUniversityId && !currentFilteredUniversities.find(u => u.universityId === lastOpenedUniversityId)) {
            closeSidebar();
        }
    } catch (error) {
        setCurrentFilteredUniversities([]);
        updateMarkers();
    }
}

// 내신 성적 편차 범위 텍스트 동기화
const scoreDiffLabel = document.querySelector('label[for="score-difference-tolerance"]');
if (scoreDiffLabel) scoreDiffLabel.textContent = '내신 성적 편차 범위 (0.0~8.0):';

document.addEventListener('DOMContentLoaded', async () => {
    initializeUiUtilsDOM({
        loadingOverlay: loadingOverlayEl,
        departmentSelectModal: departmentSelectModalEl,
        majorCategorySelect: majorCategorySelectEl,
        mediumCategorySelect: mediumCategorySelectEl,
        minorCategorySelect: minorCategorySelectEl,
        applyDepartmentSelectionButton: applyDepartmentSelectionButtonEl,
        closeDepartmentModalButton: closeDepartmentModalButtonEl,
        openDepartmentSearchModalButton: openDepartmentSearchModalButtonEl
    });
    initializeSidebarControls(sidebarDivEl, sidebarContentDivEl, closeSidebarButtonEl);
    initializeGradeModalDOM({
        gradeInputModal: gradeInputModalEl,
        modalTabsElements: modalTabsEl,
        modalTabContentsElements: modalTabContentsEl,
        // 상세 내신
        naesinDetailedForm: naesinDetailedFormEl,
        naesinSubjectRowTemplate: naesinSubjectRowTemplateEl,
        naesinGradeFormDivs: naesinGradeFormDivsEls,
        // 간편 내신
        naesinSimplifiedForm: naesinSimplifiedFormEl,
        naesinSimplifiedGradeInput: naesinSimplifiedGradeInputEl,
        naesinModeRadios: naesinModeRadiosEl,
        // 수능
        suneungExamSelector: suneungExamSelectorEl,
        suneungKoreanChoice: suneungKoreanChoiceEl, suneungKoreanRaw: suneungKoreanRawEl, 
        suneungMathChoice: suneungMathChoiceEl, suneungMathRaw: suneungMathRawEl, 
        suneungEnglishRaw: suneungEnglishRawEl, 
        suneungHistoryRaw: suneungHistoryRawEl, 
        suneungExplorer1Subject: suneungExplorer1SubjectEl, suneungExplorer1Raw: suneungExplorer1RawEl, 
        suneungExplorer2Subject: suneungExplorer2SubjectEl, suneungExplorer2Raw: suneungExplorer2RawEl, 
    });
    
    if (mapDivEl) initMap(mapDivEl); 
    else console.error("Map container not found!");

    await loadInitialMarkers(); 
    await fetchAllSubjectLists(); 
    
    populateSuneungSubjectDropdowns(); 

    // 네비게이션 바 접기/펴기 버튼 이벤트 리스너
    if (toggleNavbarButtonEl && navbarEl) {
        toggleNavbarButtonEl.addEventListener('click', () => {
            const isExpanded = toggleNavbarButtonEl.getAttribute('aria-expanded') === 'true';
            navbarEl.classList.toggle('collapsed');
            if (isExpanded) {
                // 현재 확장 상태 -> 축소
                toggleNavbarButtonEl.setAttribute('aria-expanded', 'false');
                toggleNavbarButtonEl.innerHTML = '▼ <span>펴기</span>';
                toggleNavbarButtonEl.setAttribute('aria-label', '메뉴 펴기');
            } else {
                // 현재 축소 상태 -> 확장
                toggleNavbarButtonEl.setAttribute('aria-expanded', 'true');
                toggleNavbarButtonEl.innerHTML = '▲ <span>접기</span>';
                toggleNavbarButtonEl.setAttribute('aria-label', '메뉴 접기');
            }
            // 네비게이션 바 크기 변경 후 지도의 크기를 재계산하도록 지시합니다.
            // setTimeout을 사용하여 브라우저가 레이아웃을 다시 그린 후 실행되도록 합니다.
            setTimeout(() => {
                if (map) {
                    map.invalidateSize();
                }
            }, 10);
        });
    }

    // 슬라이더/입력값 동기화 범위 0.0~8.0, step 0.1로 변경.
    scoreDifferenceToleranceInputEl.value = currentScoreDifferenceTolerance.toString();
    scoreDifferenceToleranceSliderEl.value = currentScoreDifferenceTolerance.toString();
    admissionTypeFilterSelectEl.value = currentAdmissionTypeFilter;

    scoreDifferenceToleranceInputEl.setAttribute('min', '0.0');
    scoreDifferenceToleranceInputEl.setAttribute('max', '8.0');
    scoreDifferenceToleranceInputEl.setAttribute('step', '0.1');
    scoreDifferenceToleranceSliderEl.setAttribute('min', '0.0');
    scoreDifferenceToleranceSliderEl.setAttribute('max', '8.0');
    scoreDifferenceToleranceSliderEl.setAttribute('step', '0.1');

    scoreDifferenceToleranceInputEl.addEventListener('change', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        if (!isNaN(value) && value >= 0 && value <= 8) {
            setCurrentScoreDifferenceTolerance(value);
            scoreDifferenceToleranceSliderEl.value = value.toString();
            updateMarkers(); // 프론트엔드 필터링 적용
        } else {
            (e.target as HTMLInputElement).value = currentScoreDifferenceTolerance.toString();
            alert('유효한 내신 성적 범위를 입력해주세요 (0.0 ~ 8.0).');
        }
    });

    // 사용자가 슬라이더를 드래그하는 동안 숫자 입력을 시각적으로 업데이트합니다 (UX 개선).
    // 이 이벤트는 상태를 변경하거나 지도를 업데이트하지 않습니다.
    scoreDifferenceToleranceSliderEl.addEventListener('input', (e) => {
        scoreDifferenceToleranceInputEl.value = (e.target as HTMLInputElement).value;
    });

    // 사용자가 슬라이더에서 마우스를 떼었을 때 실제 상태 업데이트와 지도 필터링을 트리거합니다.
    scoreDifferenceToleranceSliderEl.addEventListener('change', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        setCurrentScoreDifferenceTolerance(value);
        updateMarkers(); // 프론트엔드 필터링 적용
    });


    admissionTypeFilterSelectEl.addEventListener('change', (e) => {
        setCurrentAdmissionTypeFilter((e.target as HTMLSelectElement).value as AdmissionTypeFilterKey);
        // 전형 필터 변경 시에는 API를 다시 호출해야 하므로 '필터 적용' 버튼을 누르도록 유도.
        // 마커 자동 갱신은 하지 않음.
        if (sidebarDivEl.classList.contains('visible') && currentSidebarData && lastOpenedUniversityId) {
            openSidebar(lastOpenedUniversityId, currentSidebarData.departmentName);
        } else if (currentSidebarData) {
            renderSidebarContentUtil();
        }
    });


    // 필터 적용 및 지도 업데이트 버튼에만 handleFilterUpdate 연결
    applyFiltersButtonEl.addEventListener('click', handleFilterUpdate); 
    
    // 세부 전형 필터 이벤트 리스너 추가
    detailedAdmissionFilterEl.addEventListener('change', handleFilterUpdate);
    detailedAdmissionFilterEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // 기본 동작(폼 제출 등) 방지
            handleFilterUpdate();
        }
    });

    closeGradeModalButtonEl.addEventListener('click', closeGradeModal); 
    submitGradesButtonEl.addEventListener('click', () => { 
        // 현재 활성화된 입력 방식에 따라 점수를 상태에 저장
        collectSimplifiedNaesinGradeFromForm(); // 간편 입력 값 수집 (UI에 없어도 값은 읽음)
        collectSuneungGradesFromForm(); // 수능 점수 수집
        // 상세 내신은 입력 시 실시간으로 반영되므로 별도 수집 불필요
        
        closeGradeModal();
        alert("성적이 반영되었습니다. '필터 적용 및 지도 업데이트' 버튼을 클릭하여 결과를 확인하세요.");
    });

    // Suneung JSON
    saveSuneungGradesJsonButtonEl.addEventListener('click', saveSuneungGradesToJsonFile); 
    loadSuneungGradesJsonButtonEl.addEventListener('click', () => loadSuneungGradesJsonInputEl.click()); 
    loadSuneungGradesJsonInputEl.addEventListener('change', loadSuneungGradesFromJsonFile); 

    // Naesin XLS
    saveNaesinGradesXlsButtonEl.addEventListener('click', saveNaesinGradesToXlsFile);
    loadNaesinGradesXlsButtonEl.addEventListener('click', () => loadNaesinGradesXlsInputEl.click());
    loadNaesinGradesXlsInputEl.addEventListener('change', loadNaesinGradesFromXlsFile);
    
    modalTabsEl.forEach(tab => tab.addEventListener('click', handleGradeModalTabClick)); 

    if (naesinDetailedFormEl) {
        naesinDetailedFormEl.querySelectorAll('.add-subject-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const year = parseInt(target.dataset.year!) as 1 | 2 | 3;
                const semester = parseInt(target.dataset.semester!) as 1 | 2;
                if (year && semester) {
                    addNaesinSubjectRow(year, semester);
                }
            });
        });
    }

    
    suneungExamSelectorEl.addEventListener('change', async () => {
        if (suneungExamSelectorEl) {
            collectSuneungGradesFromForm(); // Update state with new exam identifier
                                            // This ensures userAllGrades.suneung.examIdentifierForCutInfo is up-to-date
        }
    });

    // Event listeners for Suneung inputs to update state on change
    [suneungKoreanRawEl, suneungMathRawEl, suneungEnglishRawEl, suneungHistoryRawEl, suneungExplorer1RawEl, suneungExplorer2RawEl,
     suneungKoreanChoiceEl, suneungMathChoiceEl, suneungExplorer1SubjectEl, suneungExplorer2SubjectEl].forEach(el => {
        if (el) {
            const eventType = (el.tagName === 'SELECT' || el.type === 'text' || el.type === 'number') ? 'change' : 'input';
            el.addEventListener(eventType, () => { 
                collectSuneungGradesFromForm(); // 실시간으로 userAllGrades.suneung 업데이트
            });
            if (el.type === 'number') {
                 el.addEventListener('input', () => {
                    collectSuneungGradesFromForm(); // 숫자 입력 시에도 실시간 업데이트
                });
            }
        }
    });

    enterGradesButtonEl.addEventListener('click', openGradeModal);

    console.log("Application initialized with real fetch API calls.");
});
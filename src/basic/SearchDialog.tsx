import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Table,
  Tag,
  TagCloseButton,
  TagLabel,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  Wrap,
} from '@chakra-ui/react';
import { useScheduleContext } from './ScheduleContext.tsx';
import type { Lecture } from './types.ts';
import { parseSchedule } from "./utils.ts";
import axios from "axios";
import { DAY_LABELS } from './constants.ts';

interface Props {
  searchInfo: {
    tableId: string;
    day?: string;
    time?: number;
  } | null;
  onClose: () => void;
}

interface SearchOption {
  query?: string,
  grades: number[],
  days: string[],
  times: number[],
  majors: string[],
  credits?: number,
}

const TIME_SLOTS = [
  { id: 1, label: "09:00~09:30" },
  { id: 2, label: "09:30~10:00" },
  { id: 3, label: "10:00~10:30" },
  { id: 4, label: "10:30~11:00" },
  { id: 5, label: "11:00~11:30" },
  { id: 6, label: "11:30~12:00" },
  { id: 7, label: "12:00~12:30" },
  { id: 8, label: "12:30~13:00" },
  { id: 9, label: "13:00~13:30" },
  { id: 10, label: "13:30~14:00" },
  { id: 11, label: "14:00~14:30" },
  { id: 12, label: "14:30~15:00" },
  { id: 13, label: "15:00~15:30" },
  { id: 14, label: "15:30~16:00" },
  { id: 15, label: "16:00~16:30" },
  { id: 16, label: "16:30~17:00" },
  { id: 17, label: "17:00~17:30" },
  { id: 18, label: "17:30~18:00" },
  { id: 19, label: "18:00~18:50" },
  { id: 20, label: "18:55~19:45" },
  { id: 21, label: "19:50~20:40" },
  { id: 22, label: "20:45~21:35" },
  { id: 23, label: "21:40~22:30" },
  { id: 24, label: "22:35~23:25" },
];

const PAGE_SIZE = 100;

const fetchMajors = () => axios.get<Lecture[]>('/schedules-majors.json');
const fetchLiberalArts = () => axios.get<Lecture[]>('/schedules-liberal-arts.json');

const fetchWithCache = () => {
  let cachedMajorsResponse: Lecture[] = [];
  let cachedLiberalArtsResponse: Lecture[] = [];

  const fetchMajorsWithCache = async () => {
    if (cachedMajorsResponse.length > 0) {
      return cachedMajorsResponse;
    }
    cachedMajorsResponse = (await fetchMajors()).data;
    return cachedMajorsResponse;
  };

  const fetchLiberalArtsWithCache = async () => {
    if (cachedLiberalArtsResponse.length > 0) {
      return cachedLiberalArtsResponse;
    }
    cachedLiberalArtsResponse = (await fetchLiberalArts()).data;
    return cachedLiberalArtsResponse;
  };

  return { fetchMajorsWithCache, fetchLiberalArtsWithCache };
};

// TODO: 이 코드를 개선해서 API 호출을 최소화 해보세요 + Promise.all이 현재 잘못 사용되고 있습니다. 같이 개선해주세요.
const fetchAllLectures = async () => {
  const { fetchMajorsWithCache, fetchLiberalArtsWithCache } = fetchWithCache();
  
  return await Promise.all([
    (console.log('API Call 1', performance.now()), fetchMajorsWithCache()),
    (console.log('API Call 2', performance.now()), fetchLiberalArtsWithCache()),
    (console.log('API Call 3', performance.now()), fetchMajorsWithCache()),
    (console.log('API Call 4', performance.now()), fetchLiberalArtsWithCache()),
    (console.log('API Call 5', performance.now()), fetchMajorsWithCache()),
    (console.log('API Call 6', performance.now()), fetchLiberalArtsWithCache()),
  ]);
}

const getFilteredLectures = (lectures: Lecture[], searchOptions: SearchOption) => {
  const { query = '', credits, grades, days, times, majors } = searchOptions;

  return lectures
    .filter(lecture =>
      lecture.title.toLowerCase().includes(query.toLowerCase()) ||
      lecture.id.toLowerCase().includes(query.toLowerCase())
    )
    .filter(lecture => grades.length === 0 || grades.includes(lecture.grade))
    .filter(lecture => majors.length === 0 || majors.includes(lecture.major))
    .filter(lecture => !credits || lecture.credits.startsWith(String(credits)))
    .filter(lecture => {
      if (days.length === 0) {
        return true;
      }
      const schedules = lecture.schedule ? parseSchedule(lecture.schedule) : [];
      return schedules.some(s => days.includes(s.day));
    })
    .filter(lecture => {
      if (times.length === 0) {
        return true;
      }
      const schedules = lecture.schedule ? parseSchedule(lecture.schedule) : [];
      return schedules.some(s => s.range.some(time => times.includes(time)));
    });
}

/** 검색어 입력 컴포넌트 */
const QueryInput: React.FC<{ query: string | undefined, changeQuery: (value: string) => void }> = memo(({ query, changeQuery }) => {
  return <Input
    placeholder="과목명 또는 과목코드"
    value={query ?? ''}
    onChange={(e) => changeQuery(e.target.value)}
  />
});

/** 학점 선택 컴포넌트 */
const CreditsSelect: React.FC<{ credits: number | undefined, changeCredits: (value: number) => void }> = memo(({ credits, changeCredits }) => {
  return <Select value={credits} onChange={(e) => changeCredits(Number(e.target.value))}>
    <option value="">전체</option>
    <option value="1">1학점</option>
    <option value="2">2학점</option>
    <option value="3">3학점</option>
  </Select>
});

/** 학년 선택 컴포넌트 */
const GradesCheckboxGroup: React.FC<{ grades: number[], changeGrades: (value: number[]) => void }> = memo(({ grades, changeGrades }) => {
  return <CheckboxGroup value={grades} onChange={(value) => changeGrades(value.map(Number))}>
    <HStack spacing={4}>
      {[1, 2, 3, 4].map(grade => <Checkbox key={grade} value={grade}>{grade}학년</Checkbox>)}
    </HStack>
  </CheckboxGroup>
});

/** 요일 선택 컴포넌트 */
const DaysCheckboxGroup: React.FC<{ days: string[], changeDays: (value: string[]) => void }> = memo(({ days, changeDays }) => {
  return <CheckboxGroup value={days} onChange={(value) => changeDays(value as string[])}>
    <HStack spacing={4}>
      {DAY_LABELS.map(day => <Checkbox key={day} value={day}>{day}</Checkbox>)}
    </HStack>
  </CheckboxGroup>
});

/** 강의 행 컴포넌트 */
const Lecture: React.FC<{ lecture: Lecture, addSchedule: (lecture: Lecture) => void }> = memo(({ lecture, addSchedule }) => {

  return <Tr>
    <Td width="100px">{lecture.id}</Td>
    <Td width="50px">{lecture.grade}</Td>
    <Td width="200px">{lecture.title}</Td>
    <Td width="50px">{lecture.credits}</Td>
    <Td width="150px" dangerouslySetInnerHTML={{ __html: lecture.major }}/>
    <Td width="150px" dangerouslySetInnerHTML={{ __html: lecture.schedule }}/>
    <Td width="80px">
      <Button size="sm" colorScheme="green" onClick={() => addSchedule(lecture)}>추가</Button>
    </Td>
  </Tr>
});

// TODO: 이 컴포넌트에서 불필요한 연산이 발생하지 않도록 다양한 방식으로 시도해주세요.
const SearchDialog = ({ searchInfo, onClose }: Props) => {
  const { setSchedulesMap } = useScheduleContext();

  const loaderWrapperRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [credits, setCredits] = useState<number | undefined>(undefined);
  const [grades, setGrades] = useState<number[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [times, setTimes] = useState<number[]>([]);
  const [majors, setMajors] = useState<string[]>([]);

  const searchOptions = useMemo(() => ({ query, credits, grades, days, times, majors }), [query, credits, grades, days, times, majors]);
  const filteredLectures = useMemo(() => getFilteredLectures(lectures, searchOptions), [lectures, searchOptions]);
  const allMajors = useMemo(() => [...new Set(lectures.map(lecture => lecture.major))], [lectures]);

  const lastPage = Math.ceil(filteredLectures.length / PAGE_SIZE);
  const visibleLectures = filteredLectures.slice(0, page * PAGE_SIZE);

  const changeSearchOption = useCallback(
    (field: keyof SearchOption, value: SearchOption[typeof field]) => {
      setPage(1);
      switch (field) {
        case 'query': setQuery(value as string); break;
        case 'credits': setCredits(value as number); break;
        case 'grades': setGrades(value as number[]); break;
        case 'days': setDays(value as string[]); break;
        case 'times': setTimes(value as number[]); break;
        case 'majors': setMajors(value as string[]); break;
      }
      loaderWrapperRef.current?.scrollTo(0, 0);
    },
    [loaderWrapperRef, setPage]
  );

  const addSchedule = useCallback(
    (lecture: Lecture) => {
      if (!searchInfo) return;

      const { tableId } = searchInfo;

      const schedules = parseSchedule(lecture.schedule).map(schedule => ({
        ...schedule,
        lecture
      }));

      setSchedulesMap(prev => ({
        ...prev,
        [tableId]: [...prev[tableId], ...schedules]
      }));

      onClose();
    },
    [searchInfo, onClose, setSchedulesMap]
  );

  useEffect(() => {
    const start = performance.now();
    console.log('API 호출 시작: ', start)
    fetchAllLectures().then(results => {
      const end = performance.now();
      console.log('모든 API 호출 완료 ', end)
      console.log('API 호출에 걸린 시간(ms): ', end - start)
      setLectures(results.flatMap(result => result));
    })
  }, []);

  useEffect(() => {
    const $loader = loaderRef.current;
    const $loaderWrapper = loaderWrapperRef.current;

    if (!$loader || !$loaderWrapper) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setPage(prevPage => Math.min(lastPage, prevPage + 1));
        }
      },
      { threshold: 0, root: $loaderWrapper }
    );

    observer.observe($loader);

    return () => observer.unobserve($loader);
  }, [lastPage]);

  useEffect(() => {
    setDays(searchInfo?.day ? [searchInfo.day] : []);
    setTimes(searchInfo?.time ? [searchInfo.time] : []);
    setPage(1);
  }, [searchInfo]);

  return (
    <Modal isOpen={Boolean(searchInfo)} onClose={onClose} size="6xl">
      <ModalOverlay/>
      <ModalContent maxW="90vw" w="1000px">
        <ModalHeader>수업 검색</ModalHeader>
        <ModalCloseButton/>
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <HStack spacing={4}>
              <FormControl>
                <FormLabel>검색어</FormLabel>
                <QueryInput query={query} changeQuery={value => changeSearchOption('query', value)} />
              </FormControl>

              <FormControl>
                <FormLabel>학점</FormLabel>
                <CreditsSelect credits={credits} changeCredits={value => changeSearchOption('credits', value)} />
              </FormControl>
            </HStack>

            <HStack spacing={4}>
              <FormControl>
                <FormLabel>학년</FormLabel>
                <GradesCheckboxGroup grades={grades} changeGrades={value => changeSearchOption('grades', value)} />
              </FormControl>

              <FormControl>
                <FormLabel>요일</FormLabel>
                <DaysCheckboxGroup days={days} changeDays={value => changeSearchOption('days', value)} />
              </FormControl>
            </HStack>

            <HStack spacing={4}>
              <FormControl>
                <FormLabel>시간</FormLabel>
                <CheckboxGroup
                  colorScheme="green"
                  value={times}
                  onChange={(values) => changeSearchOption('times', values.map(Number))}
                >
                  <Wrap spacing={1} mb={2}>
                    {times.sort((a, b) => a - b).map(time => (
                      <Tag key={time} size="sm" variant="outline" colorScheme="blue">
                        <TagLabel>{time}교시</TagLabel>
                        <TagCloseButton
                          onClick={() => changeSearchOption('times', times.filter(v => v !== time))}/>
                      </Tag>
                    ))}
                  </Wrap>
                  <Stack spacing={2} overflowY="auto" h="100px" border="1px solid" borderColor="gray.200"
                         borderRadius={5} p={2}>
                    {TIME_SLOTS.map(({ id, label }) => (
                      <Box key={id}>
                        <Checkbox key={id} size="sm" value={id}>
                          {id}교시({label})
                        </Checkbox>
                      </Box>
                    ))}
                  </Stack>
                </CheckboxGroup>
              </FormControl>

              <FormControl>
                <FormLabel>전공</FormLabel>
                <CheckboxGroup
                  colorScheme="green"
                  value={majors}
                  onChange={(values) => changeSearchOption('majors', values as string[])}
                >
                  <Wrap spacing={1} mb={2}>
                    {majors.map(major => (
                      <Tag key={major} size="sm" variant="outline" colorScheme="blue">
                        <TagLabel>{major.split("<p>").pop()}</TagLabel>
                        <TagCloseButton
                          onClick={() => changeSearchOption('majors', majors.filter(v => v !== major))}/>
                      </Tag>
                    ))}
                  </Wrap>
                  <Stack spacing={2} overflowY="auto" h="100px" border="1px solid" borderColor="gray.200"
                         borderRadius={5} p={2}>
                    {allMajors.map(major => (
                      <Box key={major}>
                        <Checkbox key={major} size="sm" value={major}>
                          {major.replace(/<p>/gi, ' ')}
                        </Checkbox>
                      </Box>
                    ))}
                  </Stack>
                </CheckboxGroup>
              </FormControl>
            </HStack>
            <Text align="right">
              검색결과: {filteredLectures.length}개
            </Text>
            <Box>
              <Table>
                <Thead>
                  <Tr>
                    <Th width="100px">과목코드</Th>
                    <Th width="50px">학년</Th>
                    <Th width="200px">과목명</Th>
                    <Th width="50px">학점</Th>
                    <Th width="150px">전공</Th>
                    <Th width="150px">시간</Th>
                    <Th width="80px"></Th>
                  </Tr>
                </Thead>
              </Table>

              <Box overflowY="auto" maxH="500px" ref={loaderWrapperRef}>
                <Table size="sm" variant="striped">
                  <Tbody>
                    {visibleLectures.map((lecture, index) => (
                      <Lecture key={`${lecture.id}-${index}`} lecture={lecture} addSchedule={addSchedule} />
                    ))}
                  </Tbody>
                </Table>
                <Box ref={loaderRef} h="20px"/>
              </Box>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};


export default SearchDialog;